import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FundsService } from "../../../pages/services/funds.service";
import { UserStateService } from "../../../store/user-state.service";
import { MultimediaService } from "../../../pages/services/multimedia.service";
import { catchError, of, Subscription } from "rxjs";
import { DateTimeUtil } from "../../../utils/date-time.utils";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { AnyCnameRecord } from "node:dns";

@Component({
  selector: "app-hb-payout-report",

  templateUrl: "./hb-payout-report.component.html",
  styleUrl: "./hb-payout-report.component.css",
})
export class HbPayoutReportComponent implements OnInit, OnDestroy {
  approvedpayouts: any[] = [];

  payoutTotalRecords = 0;
  pagedApprovedPayoutsData: any[] = [];
  displayFields: any[] = [];
  entityId: any;
  userId: string | null = null;
  role: string | null = "";

  showChatModal = false;
  threadMessages: any[] = [];
  loadingThreads = false;
  selectedMode: "all" | "upi" | "bank" = "all";

  selectedStatus: "ACCEPTED" | "REJECTED" | "DISPUTE_ESCALATED" =
    "DISPUTE_ESCALATED";

  private routeSub: Subscription | null = null;

  // active view
  activeView: any;
  imageError = false;

  allRejectedPayouts: any[] = [];
  // Payout filters
  payoutSearchQuery = "";
  payoutcomPartFilter = "";
  payoutDateFrom = "";
  payoutDateTo = "";

  // ========== PAGINATION (client‑side) ==========

  payoutApprovedPage = 0;
  payoutApprovedPageSize = 10;
  payoutApprovedPageSizes = [10, 20, 25, 50];
  comPartOptions: { id: string; domain: string }[] = [];
  // ========== FILTER DROPDOWN STATE ==========
  filterDropdownOpen: string | null = null;

  // ========== CUSTOM comPart DROPDOWN STATE ==========

  payoutcomPartDropdownOpen = false;

  // ========== MODAL & LIGHTBOX STATE ==========
  showRecordModal = false;
  selectedRecord: any = null;
  lightboxImage: string | null = null;

  // Colors based on role (already in template via data-role)
  colors: any = null;
  headcomParts: any[] = [];

  // ========== STATUS VALUES THAT ALLOW THE THREAD BUTTON ==========
  // Thread button sirf PENDING / ACCEPTED (dispute pending) filter par dikhana hai
  private readonly THREAD_ALLOWED_STATUSES = [
    "DISPUTE_ESCALATED",
    "ACCEPTED",
    "REJECTED",
  ];

  constructor(
    private route: ActivatedRoute,
    private fundService: FundsService,
    private userStateService: UserStateService,
    private multimediaService: MultimediaService,
    private snackbar: SnackbarService,

    private router: Router,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.userId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    //  default status
    this.selectedStatus = "ACCEPTED";

    this.setColorsByRole();

    this.fetchAllRejectedPayouts();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const type = params.get("type") as "payout" | null;

      //  only payout view
      this.activeView = type || "payout";

      if (!this.entityId) return;

      //  always call API
      // this.fetchAllRejectedPayouts();
    });
  }

  formatDateWithFixedTime(dateStr: string, type: "start" | "end"): string {
    const date = new Date(dateStr);

    if (type === "start") {
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }

    return date.toISOString(); // converts to UTC (your required format)
  }

  fetchAllRejectedPayouts(): void {
    if (!this.entityId) return;

    const fromDate = this.payoutDateFrom
      ? DateTimeUtil.toUtcISOString(
          new Date(new Date(this.payoutDateFrom).setHours(0, 0, 0, 0)),
        )
      : undefined;

    const toDate = this.payoutDateTo
      ? DateTimeUtil.toUtcISOString(
          new Date(new Date(this.payoutDateTo).setHours(23, 59, 59, 999)),
        )
      : undefined;
    const isAll = !this.payoutcomPartFilter;

    this.fundService
      .getAllPayoutFundWithEntityAndCpId(
        this.entityId,

        this.selectedStatus,
        this.payoutApprovedPage, // ✅ current page
        this.payoutApprovedPageSize, // ✅ dynamic page size
        undefined,
        fromDate,
        toDate,
        this.role,
      )
      .pipe(
        catchError((err) => {
          this.snackbar.show("Failed to load payouts", false);

          return of({
            data: [],
            total: 0,
          });
        }),
      )
      .subscribe((response: any) => {
        const list = this.extractListFromResponse(response);

        // ✅ only current page data
        this.allRejectedPayouts = list;

        // ✅ map for UI
        this.mapPayoutArray(list);

        // ✅ backend total
        this.payoutTotalRecords =
          response?.data?.totalElements ||
          response?.totalElements ||
          response?.total ||
          list.length;
      });
  }

  // Helper to extract list from various response shapes
  private extractListFromResponse(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.data) {
      if (Array.isArray(response.data)) return response.data;
      if (response.data.content) return response.data.content;
    }
    if (response?.content) return response.content;
    return [];
  }

  private extractTotalFromResponse(response: any): number {
    if (response?.total) return response.total;
    if (response?.data?.totalElements) return response.data.totalElements;
    if (response?.totalElements) return response.totalElements;
    return 0;
  }

  setColorsByRole() {
    const head = {
      primary: "#E67A00",
      secondary: "#FFB366",
      bg: "#FFF9F2",
      font: "#1F2937",
      border: "#CC6A00",
      hover: "#FF8A1A",
      glow: "rgba(230,122,0,0.50)",
    };
    const branch = {
      primary: "#FFC61A",
      secondary: "#FFE699",
      bg: "#FFFDF2",
      font: "#1F2937",
      border: "#E6B800",
      hover: "#FFD54F",
      glow: "rgba(255,198,26,0.50)",
    };

    if (!this.role) {
      this.colors = branch;
      return;
    }

    const low = String(this.role).toLowerCase();
    if (low.includes("head")) {
      this.colors = head;
    } else if (low.includes("branch")) {
      this.colors = branch;
    } else {
      this.colors = branch;
    }
  }

  fetchApprovedPayouts(): void {
    if (!this.entityId) return;

    this.fundService
      .getAllpayoutTrueFalseBybranchIdPaginate(
        this.entityId,
        "CP_REJECTED", // changed from ACCEPTED to REJECTED
        this.payoutApprovedPage,
        this.payoutApprovedPageSize,
        this.payoutSearchQuery,
      )
      .pipe(
        catchError((err) => {
          return of({ data: [], total: 0 });
        }),
      )
      .subscribe((response: any) => {
        const { list, total, pageNum, pageSize } = this.parseResponse(response);
        this.payoutTotalRecords = total;
        this.payoutApprovedPage = pageNum;
        this.payoutApprovedPageSize = pageSize;
        this.mapPayoutArray(list);
      });
  }

  // Helper to parse various response shapes
  private parseResponse(response: any): {
    list: any[];
    total: number;
    pageNum: number;
    pageSize: number;
  } {
    let list: any[] = [];
    let total = 0;
    let pageNum = 0;
    let pageSize = 10;

    if (Array.isArray(response)) {
      list = response;
      total = list.length;
    } else if (response?.data) {
      if (Array.isArray(response.data)) {
        list = response.data;
        total = response.total ?? list.length;
      } else if (Array.isArray(response.data.content)) {
        list = response.data.content;
        total =
          response.data.totalElements ?? response.data.total ?? list.length;
        pageNum = response.data.number ?? 0;
        pageSize = response.data.size ?? 10;
      }
    } else if (response?.content) {
      list = response.content;
      total = response.totalElements ?? response.total ?? list.length;
      pageNum = response.number ?? 0;
      pageSize = response.size ?? 10;
    }

    return { list, total, pageNum, pageSize };
  }

  // ============ CATEGORY HELPERS ============
  // mode values: BANK, UPI, BEP20, TRC20, ERC20, SPL, OMNI
  // Isse teen buckets mein daal dete hain: 'bank' | 'upi' | 'crypto'
  private getCategory(typeVal: string): "bank" | "upi" | "crypto" {
    const t = (typeVal || "").toUpperCase();
    if (t === "BANK") return "bank";
    if (t === "UPI") return "upi";
    return "crypto"; // BEP20, TRC20, ERC20, SPL, OMNI
  }

  // Category ke hisaab se sahi identifier (account no / vpa / wallet) nikalna
  private getIdentifier(category: string, it: any): string {
    if (category === "bank")
      return it.accountNo || it.accNo || it.account || "-";
    if (category === "upi") return it.vpa || it.vpaId || it.upiId || "-";
    return it.walletAddress || it.wallet || "-"; // crypto
  }

  // ============ MAPPERS ============

  private mapPayoutArray(items: any[]) {
    this.approvedpayouts = items.map((it: any) => {
      const modeVal = it.mode || it.payoutType || "BANK";
      const category = this.getCategory(modeVal);

      return {
        mode: "payout",
        category: category, // 'bank' | 'upi' | 'crypto'
        payoutType: modeVal, // BANK / UPI / BEP20 / TRC20 / ERC20 / SPL / OMNI

        displayId: it.displayId || "-",
        userId: it.userId || "-",

        // ✅ unified identifier for table (account no / vpa / wallet address)
        identifier: this.getIdentifier(category, it),

        accountNo: it.accountNo || it.raw?.accountNo || it.accNo || "-",
        ifscCode: it.ifsc || it.ifscCode || null,
        walletAddress: it.walletAddress || it.wallet || null,
        vpa: it.vpa || it.upiId || null,
        holder: it.holder,

        transactionId: it.transactionId || it.txnId || "-",

        amount: Number(it.currencyWiseAmount ?? it.amount ?? it.value ?? 0),
        currency: it.currency || "INR",

        status: it.status || it.state || "-",
        reviewStatus: it.reviewStatus,
        remarks: it.remarks,
        portalDomain: it.portalDomain,
        queryText: it.queryText,
        rejectionFilePath: it.rejectionFilePath,

        date: it.dateTime
          ? new Date(it.dateTime)
          : it.createdAt
            ? new Date(it.createdAt)
            : new Date(),

        raw: it.raw || it,
      };
    });

    this.approvedpayouts.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );

    // ✅ HOLD DATA IN VARIABLE
    this.pagedApprovedPayoutsData = [...this.approvedpayouts];
  }

  filteredApprovedpayouts(): any[] {
    return this.approvedpayouts;
  }

  payoutApprovedTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.payoutTotalRecords / this.payoutApprovedPageSize),
    );
  }

  // ============ PAGINATION CONTROLS ============

  setpayoutApprovedPage(p: number) {
    const total = this.payoutApprovedTotalPages();
    const newPage = Math.max(0, Math.min(p, total - 1));
    if (newPage !== this.payoutApprovedPage) {
      this.payoutApprovedPage = newPage;
      this.fetchApprovedPayouts();
    }
  }
  onChangepayoutApprovedPageSize(size: number) {
    this.payoutApprovedPageSize = Number(size);

    this.payoutApprovedPage = 0;

    this.fetchAllRejectedPayouts();
  }

  // ============ FILTER DROPDOWN CONTROLS ============
  toggleFilterDropdown(view: string) {
    if (this.filterDropdownOpen === view) {
      this.filterDropdownOpen = null;
    } else {
      this.filterDropdownOpen = view;
    }
  }

  get payoutFilterActive(): boolean {
    return !!(this.payoutDateFrom || this.payoutDateTo);
  }

  clearPayoutDateFilters() {
    this.payoutDateFrom = "";
    this.payoutDateTo = "";

    this.applyPayoutFilters();
  }

  // ============ comPart DROPDOWN CONTROLS ============
  togglecomPartDropdown(view: "upi" | "bank" | "payout") {
    if (view === "payout") {
      this.payoutcomPartDropdownOpen = !this.payoutcomPartDropdownOpen;
    }
  }

  selectcomPart(view: "upi" | "bank" | "payout", comPart: any) {
    const comPartId = !comPart || comPart.id === "" ? "" : comPart.id;

    if (view === "payout") {
      this.payoutcomPartFilter = comPartId;

      // ✅ close dropdown
      this.payoutcomPartDropdownOpen = false;

      // ✅ reset page
      this.payoutApprovedPage = 0;

      // ✅ API call
      this.fetchAllRejectedPayouts();
    }
  }

  applyPayoutFilters() {
    // ✅ reset page
    this.payoutApprovedPage = 0;

    // ✅ always fetch from API
    this.fetchAllRejectedPayouts();

    // ✅ close dropdown
    this.filterDropdownOpen = null;
  }

  applyPayoutFiltersAndClose() {
    this.applyPayoutFilters();
  }

  clearPayoutFilters() {
    this.payoutSearchQuery = "";
    this.payoutcomPartFilter = "";
    this.payoutDateFrom = "";
    this.payoutDateTo = "";

    // ✅ reset status
    this.selectedStatus = "ACCEPTED";

    // ✅ reset page
    this.payoutApprovedPage = 0;

    // ✅ close dropdown
    this.filterDropdownOpen = null;

    // ✅ fetch fresh data
    this.fetchAllRejectedPayouts();
  }
  // ============ HOST LISTENER for outside click ============
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      target.closest(".date-filter-container") ||
      target.closest(".date-filter-button")
    ) {
      return;
    }
    this.filterDropdownOpen = null;
  }

  // ============ MODAL & LIGHTBOX ============
  openRecordModal(record: any) {
    this.selectedRecord = record;

    this.displayFields = this.getDisplayFields(record);

    this.showRecordModal = true;

    this.loadImages(record);
  }

  closeRecordModal() {
    if (this.selectedRecord?.images) {
      this.selectedRecord.images.forEach((url: string) => {
        URL.revokeObjectURL(url); //
      });
    }
    this.selectedRecord = null;
    this.showRecordModal = false;
    this.closeLightbox();
  }

  openLightbox(imageUrl: string | null) {
    if (imageUrl) {
      this.lightboxImage = imageUrl;
    }
  }

  closeLightbox() {
    this.lightboxImage = null;
  }

  @HostListener("document:keydown.escape", ["$event"])
  handleEscape(event: any) {
    if (this.lightboxImage) {
      this.closeLightbox();
    }
  }

  // ============ UI HELPERS ============
  formatCurrency(v: number) {
    if (v == null || isNaN(v)) return "0.00";
    return Number(v).toFixed(2);
  }

  // ✅ Thread button sirf PENDING / ACCEPTED (dispute pending) status filter par dikhana hai
  isThreadAllowed(): boolean {
    const status = String(this.selectedStatus || "").toUpperCase();

    return [
      "ACCEPTED",
      "REJECTED",
      "CP_REJECTED",
      "DISPUTE_ESCALATED",
    ].includes(status);
  }

  getStatusClass(status: string): string {
    const st = (status || "").toLowerCase();
    if (st.includes("accept") || st.includes("completed") || st === "success") {
      return "status-approved";
    }
    if (st.includes("pending")) {
      return "status-pending";
    }
    if (
      st.includes("reject") ||
      st.includes("failed") ||
      st.includes("decline")
    ) {
      return "status-rejected";
    }
    return "status-default";
  }

  loadImages(rec: any) {
    if (!rec) return;

    const raw = rec.raw || {};

    // NORMAL
    rec.proofImages = [];
    rec.proofPdfs = [];

    // ACCEPTED
    rec.acceptedImages = [];
    rec.acceptedPdfs = [];

    // REJECTED
    rec.rejectedImages = [];
    rec.rejectedPdfs = [];

    this.imageError = false;

    // ================= COMMON HANDLER =================
    const processFile = (
      filePath: string,
      imageArray: any[],
      pdfArray: any[],
      pdfName: string,
    ) => {
      if (
        !filePath ||
        filePath === "null" ||
        filePath === "undefined" ||
        filePath.trim() === ""
      ) {
        return;
      }

      this.multimediaService.getPrivateImage(filePath).subscribe({
        next: (url) => {
          const img = new Image();

          img.onload = () => {
            // VALID IMAGE
            imageArray.push(url);
          };

          img.onerror = () => {
            // NOT IMAGE => PDF/DOWNLOAD
            pdfArray.push({
              url,
              name: pdfName,
            });
          };

          img.src = url;
        },

        error: () => {
          this.imageError = true;
        },
      });
    };

    // ================= FILE PROOF =================
    processFile(raw.filePath, rec.proofImages, rec.proofPdfs, "File Proof");

    // ================= ACCEPTED PROOF =================
    processFile(
      raw.acceptFilePath,
      rec.acceptedImages,
      rec.acceptedPdfs,
      "Accepted Proof",
    );

    // ================= REJECTED PROOF =================
    processFile(
      raw.rejectionFilePath,
      rec.rejectedImages,
      rec.rejectedPdfs,
      "Rejected Proof",
    );
  }

  onImageError(ev: any) {
    if (ev && ev.target) {
      ev.target.src = "";
    }
  }

  // ============ DETAILS MODAL FIELDS (category-wise) ============
  getDisplayFields(record: any): any[] {
    if (!record) return [];

    const category: "bank" | "upi" | "crypto" =
      record.category || this.getCategory(record.payoutType || record.mode);

    const common = [
      { label: "Display ID", value: record.displayId || "—" },
      { label: "User ID", value: record.userId || "—" },
      { label: "Transaction ID / UTR", value: record.transactionId || "—" },
      { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
      { label: "Currency", value: record.currency || "—" },
      { label: "Status", value: record.status || "—" },
      { label: "Review Status", value: record.reviewStatus || "—" },
      { label: "Remarks", value: record.remarks || "—" },
      { label: "Query Text", value: record.queryText || "—" },
      {
        label: "Date",
        value: record.date ? new Date(record.date).toLocaleString() : "—",
      },
    ];

    if (category === "bank") {
      return [
        { label: "Account Number", value: record.accountNo || "—" },
        {
          label: "IFSC Code",
          value: record.ifscCode || record.ifsc || record.bankCode || "—",
        },
        {
          label: "Account Holder",
          value: record.holder || record.accountHolder || "—",
        },
        ...common,
      ];
    }

    if (category === "upi") {
      return [
        { label: "VPA / UPI ID", value: record.vpa || "—" },
        {
          label: "Account Holder",
          value: record.holder || record.accountHolder || "—",
        },
        ...common,
      ];
    }

    // crypto (BEP20 / TRC20 / ERC20 / SPL / OMNI)
    return [
      { label: "Wallet Address", value: record.walletAddress || "—" },
      { label: "Network / Type", value: record.payoutType || "—" },
      ...common,
    ];
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
      this.routeSub = null;
    }
  }

  refreshCurrentView(): void {
    if (!this.entityId) return;

    if (this.activeView === "payout") {
      this.fetchAllRejectedPayouts();
    }
  }
  setPayoutPage(page: number) {
    const totalPages = this.payoutApprovedTotalPages();

    const newPage = Math.max(0, Math.min(page, totalPages - 1));

    if (newPage !== this.payoutApprovedPage) {
      this.payoutApprovedPage = newPage;

      // ✅ fetch current page
      this.fetchAllRejectedPayouts();
    }
  }

  getSelectedcomPartDomain(view: "upi" | "bank" | "payout"): string {
    let selectedId = "";

    if (view === "payout") selectedId = this.payoutcomPartFilter;

    const found = this.comPartOptions.find((p) => p.id === selectedId);

    return found ? found.domain : "All Comparts";
  }
  onStatusChange(status: any) {
    this.selectedStatus = status;

    // ✅ reset page
    this.payoutApprovedPage = 0;

    // ✅ API call
    this.fetchAllRejectedPayouts();
  }

  openPdf(url: string) {
    window.open(url, "_blank");
  }

  getFundType(): string {
    if (this.selectedMode === "upi") return "UPI";

    if (this.selectedMode === "bank") return "BANK";

    return "ALL";
  }

  //new
  openChatModal(record: any) {
    if (!record) return;

    this.selectedRecord = record;

    this.showChatModal = true;

    // ✅ API CALL
    this.loadThreadMessages(record);
  }

  closeChatModal() {
    this.showChatModal = false;
    this.threadMessages = [];
  }
  // ===================== LOAD THREAD API =====================

  // ===================== LOAD THREAD FILES =====================
  loadThreadMessages(record: any) {
    const entityId = this.entityId;

    const entityType = this.role;

    const fundId = record?.raw?.id || record?.id;

    const fundType =
      record?.category === "upi"
        ? "UPI"
        : record?.category === "bank"
          ? "BANK"
          : "PAYOUT";

    if (!entityId || !entityType || !fundId || !fundType) {
      return;
    }

    this.loadingThreads = true;

    this.fundService
      .getThreadByEntityIdTypeAndFund(entityId, entityType, fundId, fundType)
      .subscribe({
        next: (res: any) => {
          this.loadingThreads = false;

          this.threadMessages = Array.isArray(res?.data) ? res.data : [];

          // ✅ LOAD FILES
          this.threadMessages.forEach((msg: any) => {
            this.loadThreadImages(msg);
          });
        },

        error: (err) => {
          this.loadingThreads = false;

          this.threadMessages = [];
        },
      });
  }
  loadThreadImages(rec: any) {
    if (!rec) return;

    rec.proofImages = [];
    rec.proofPdfs = [];

    rec.rejectedImages = [];
    rec.rejectedPdfs = [];

    this.imageError = false;

    // NORMAL FILE
    if (
      rec.filePath &&
      rec.filePath !== "null" &&
      rec.filePath !== "undefined"
    ) {
      this.multimediaService.getPrivateImage(rec.filePath).subscribe({
        next: (url) => {
          const img = new Image();

          img.onload = () => {
            rec.proofImages.push(url);
          };

          img.onerror = () => {
            rec.proofPdfs.push({
              url,
              name: "Proof File",
            });
          };

          img.src = url;
        },
      });
    }

    // REJECTED FILE
    if (
      rec.rejectionFilePath &&
      rec.rejectionFilePath !== "null" &&
      rec.rejectionFilePath !== "undefined"
    ) {
      this.multimediaService.getPrivateImage(rec.rejectionFilePath).subscribe({
        next: (url) => {
          const img = new Image();

          img.onload = () => {
            rec.rejectedImages.push(url);
          };

          img.onerror = () => {
            rec.rejectedPdfs.push({
              url,
              name: "Rejected Proof",
            });
          };

          img.src = url;
        },
      });
    }
  }
  goToThread(msg: any) {
    const threadId = msg?.id;

    if (!threadId) {
      return;
    }

    if (this.role === "HEAD") {
      this.router.navigate(["/head/chat"], {
        queryParams: { threadId: threadId },
      });
    } else if (this.role === "BRANCH") {
      this.router.navigate(["/branch/chat"], {
        queryParams: { threadId: threadId },
      });
    }
  }
}
