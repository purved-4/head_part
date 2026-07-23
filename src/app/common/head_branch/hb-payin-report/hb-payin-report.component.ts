import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { ActivatedRoute, Route, Router } from "@angular/router";
import { of, Subscription } from "rxjs";
import { catchError } from "rxjs/operators";
import { FundsService } from "../../../pages/services/funds.service";
import { UserStateService } from "../../../store/user-state.service";
import { HeadService } from "../../../pages/services/head.service";
import { MultimediaService } from "../../../pages/services/multimedia.service";
import { DateTimeUtil } from "../../../utils/date-time.utils";
import { BranchService } from "../../../pages/services/branch.service";
import { SnackbarService } from "../../snackbar/snackbar.service";

@Component({
  selector: "app-hb-payin-report",

  templateUrl: "./hb-payin-report.component.html",
  styleUrl: "./hb-payin-report.component.css",
})
export class HbPayinReportComponent implements OnInit, OnDestroy {
  approvedpayins: any[] = [];
  pagedBankPayinsData: any[] = [];

  // Pagination metadata from server
  payinTotalRecords = 0;

  // Mode filter
  selectedMode: "upi" | "bank" = "bank";

  // Status filter
  selectedStatus: "ACCEPTED" | "REJECTED" | "PENDING" = "PENDING";

  // route + user ids
  entityId: any;
  userId: string | null = null;
  role: string | null = "";

  private routeSub: Subscription | null = null;
  imageError = false;
  // active view
  activeView: "upi" | "bank" | "payout" = "upi";

  showChatModal = false;
  threadMessages: any[] = [];
  loadingThreads = false;
  // Bank filters
  bankSearchQuery = "";
  bankcomPartFilter = "";
  bankDateFrom = "";
  bankDateTo = "";

  payinPage = 0;
  payinPageSize = 10;
  payinPageSizes = [5, 10, 20, 25, 50];

  payinApprovedPageSize = 10;

  // ========== FILTER DROPDOWN STATE ==========
  filterDropdownOpen: string | null = null; // 'upi' | 'bank' | 'payout' | null

  // ========== CUSTOM comPart DROPDOWN STATE ==========
  bankcomPartDropdownOpen = false;

  // ========== MODAL & LIGHTBOX STATE ==========
  showRecordModal = false;
  selectedRecord: any = null;
  lightboxImage: string | null = null;
  isRefreshing = false;

  // Colors based on role (already in template via data-role)
  colors: any = null;
  comPartOptions: { id: string; domain: string }[] = [];
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

    this.setColorsByRole();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const type = params.get("type") as "upi" | "bank" | "payout" | null;
      this.activeView = type === "payout" ? "payout" : "bank";

      if (!this.entityId) return;

      this.fetchBankPayins(); // ✅ yahan hai already - check karo entityId console mein
    });
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

  fetchBankPayins(): void {
    if (!this.entityId) return;

    const fromDate = this.bankDateFrom
      ? DateTimeUtil.toUtcISOString(
          new Date(new Date(this.bankDateFrom).setHours(0, 0, 0, 0)),
        )
      : undefined;

    const toDate = this.bankDateTo
      ? DateTimeUtil.toUtcISOString(
          new Date(new Date(this.bankDateTo).setHours(23, 59, 59, 999)),
        )
      : undefined;
    const isAll = !this.bankcomPartFilter;
    const comPartId = this.bankcomPartFilter || "ALL";
    this.fundService
      .getPayinFundWithCpIdAndEntityId(
        this.entityId,
        this.payinPage,
        this.payinPageSize,
        undefined,
        fromDate,
        toDate,
        this.selectedMode,
        this.role,
        this.selectedStatus,
      )
      .pipe(catchError(() => of({ content: [], totalElements: 0 })))
      .subscribe((response: any) => {
        const { list, total, pageNum, pageSize } = this.parseResponse(response);

        this.payinTotalRecords = total;
        this.payinPage = pageNum;
        this.payinPageSize = pageSize;

        this.mapFundsArray(list, "bank");
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
    } else if (response?.content) {
      list = response.content || [];
      total = response.totalElements ?? list.length;
      pageNum = response.pageNumber ?? response.number ?? 0;
      pageSize = response.pageSize ?? 10;
    } else if (response?.data?.content) {
      list = response.data.content || [];
      total = response.data.totalElements ?? list.length;
      pageNum = response.data.pageNumber ?? response.data.number ?? 0;
      pageSize = response.data.pageSize ?? 10;
    } else if (Array.isArray(response?.data)) {
      list = response.data;
      total = response.total ?? list.length;
    }

    return { list, total, pageNum, pageSize };
  }
  // ============ MAPPERS ============

  private mapFundsArray(items: any[], mode: "bank" | "upi") {
    this.approvedpayins = items.map((it: any) => ({
      mode: mode,

      comPart: it.comPartDomain || it.comPartId || "—",
      comPartId: it.comPartId || it.raw?.comPartId || null,

      vpa: it.vpa || it.vpaId || it.upiId,
      upiId: it.upiId,

      accountNo: it.accountNo || it.accNo || it.account,

      transactionId: it.transactionId || it.txnId,

      amount: Number(it.amount ?? it.value ?? 0),

      settled: it.settled,

      reviewStatus: it.reviewStatus || it.review,

      status: it.status || it.state,

      date: it.createdAt ? new Date(it.createdAt) : new Date(),

      raw: it,
    }));

    this.approvedpayins.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );

    // ✅ HOLD DATA
    this.pagedBankPayinsData = [...this.approvedpayins];
  }

  filteredBankpayins(): any[] {
    return this.approvedpayins;
  }

  bankTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.payinTotalRecords / this.payinApprovedPageSize),
    );
    Math.ceil(this.filteredBankpayins().length / this.payinPageSize);
  }

  setpayinPage(p: number) {
    const totalPages = this.bankTotalPages();
    this.payinPage = Math.max(0, Math.min(p, totalPages - 1));
  }

  onChangepayinPageSize(size: number) {
    this.payinPageSize = Number(size);
    this.payinPage = 0;
  }

  // ============ FILTER DROPDOWN CONTROLS ============
  toggleFilterDropdown(view: string) {
    this.filterDropdownOpen = this.filterDropdownOpen === view ? null : view;
  }

  get bankFilterActive(): boolean {
    return !!(this.bankDateFrom || this.bankDateTo);
  }

  clearBankDateFilters() {
    this.bankDateFrom = "";
    this.bankDateTo = "";
  }

  // ============ comPart DROPDOWN CONTROLS ============
  togglecomPartDropdown(view: "upi" | "bank" | "payout") {
    this.bankcomPartDropdownOpen = !this.bankcomPartDropdownOpen;
  }

  selectcomPart(view: "upi" | "bank" | "payout", comPart: any) {
    // CURRENT
    const comPartId = !comPart || comPart.id === "ALL" ? "" : comPart.id;

    // FIX - same rehne do, but fetchBankPayins ensure karo
    this.bankcomPartFilter = !comPart || comPart.id === "ALL" ? "" : comPart.id;
    this.bankcomPartDropdownOpen = false;
    this.payinPage = 0;
    this.fetchBankPayins(); // ✅ yeh call ho rahi hai
  }

  applyBankFilters() {
    this.payinPage = 0;
    this.fetchBankPayins();
  }

  applyBankFiltersAndClose() {
    this.applyBankFilters();
    this.filterDropdownOpen = null;
  }

  clearBankFilters() {
    this.bankSearchQuery = "";
    this.bankcomPartFilter = "";
    this.bankDateFrom = "";
    this.bankDateTo = "";

    this.payinPage = 0;
    // this.fetchBankPayins(); // ✅ REQUIRED
  }

  // ============ REFRESH BUTTON ============
  refreshCurrentView(): void {
    this.fetchBankPayins();
  }

  refreshPage(): void {
    this.isRefreshing = true;
    setTimeout(() => {
      this.refreshCurrentView();
    }, 100);
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
  // openRecordModal(record: any) {
  //   this.selectedRecord = record;
  //   this.showRecordModal = true;
  // }

  openRecordModal(record: any) {
    this.selectedRecord = record;

    this.loadImages(this.selectedRecord);

    this.showRecordModal = true;
  }
  closeRecordModal() {
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

  loadImage(rec: any) {
    if (!rec) return;

    const raw = rec.raw || {};

    rec.images = [];
    this.imageError = false;

    // ✅ sirf filePath (Approved case)
    if (
      raw.filePath &&
      raw.filePath !== "null" &&
      raw.filePath !== "undefined" &&
      raw.filePath.trim() !== ""
    ) {
      this.multimediaService.getPrivateImage(raw.filePath).subscribe({
        next: (url) => {
          rec.images.push(url);
        },
        error: () => {
          this.imageError = true;
        },
      });
    } else {
      rec.images = [];
    }
  }
  loadImages(rec: any) {
    if (!rec) return;

    const raw = rec.raw || {};

    rec.proofImages = [];
    rec.proofPdfs = [];

    rec.rejectedImages = [];
    rec.rejectedPdfs = [];

    this.imageError = false;

    // ================= NORMAL FILE =================
    if (raw.filePath) {
      this.multimediaService.getPrivateImage(raw.filePath).subscribe({
        next: (url) => {
          rec.proofImages.push(url);
        },
        error: () => {
          this.imageError = true;
        },
      });
    }

    // ================= REJECTED FILE =================
    if (raw.rejectionFilePath) {
      this.multimediaService.getPrivateImage(raw.rejectionFilePath).subscribe({
        next: (url) => {
          // ✅ Check whether URL is image
          const img = new Image();

          img.onload = () => {
            // ✅ Valid image
            rec.rejectedImages.push(url);
          };

          img.onerror = () => {
            // ✅ Not image => treat as PDF/download
            rec.rejectedPdfs.push({
              url,
              name: "Rejected Proof",
            });
          };

          img.src = url;
        },

        error: () => {
          this.imageError = true;
        },
      });
    }
  }

  // private processFile(
  //   filePath: string,
  //   imageArray: any[],
  //   pdfArray: any[],
  //   pdfName: string,
  // ) {
  //   if (
  //     !filePath ||
  //     filePath === "null" ||
  //     filePath === "undefined" ||
  //     String(filePath).trim() === ""
  //   ) {
  //     return;
  //   }

  //   const lowerPath = String(filePath).toLowerCase();

  //   // ✅ detect pdf from original path
  //   const isPdf =
  //     lowerPath.includes(".pdf") ||
  //     lowerPath.includes("/pdf/") ||
  //     lowerPath.includes("pdf") ||
  //     lowerPath.includes("application/pdf");

  //   // ✅ DIRECTLY HANDLE PDF
  //   if (isPdf) {
  //     this.multimediaService.getPrivateImage(filePath).subscribe({
  //       next: (url) => {
  //         pdfArray.push({
  //           url,
  //           name: pdfName,
  //         });
  //       },
  //       error: () => {
  //         this.imageError = true;
  //       },
  //     });

  //     return;
  //   }

  //   // ✅ IMAGE
  //   this.multimediaService.getPrivateImage(filePath).subscribe({
  //     next: (url) => {
  //       imageArray.push(url);
  //     },

  //     error: () => {
  //       this.imageError = true;
  //     },
  //   });
  // }
  onImageError(ev: any) {
    if (ev && ev.target) {
      ev.target.src = "";
    }
  }

  getDisplayFields(record: any): any[] {
    if (!record) return [];

    const mode =
      record.mode ||
      (record.vpa ? "upi" : record.accountNo ? "bank" : "payout");

    switch (mode) {
      case "upi":
        return [
          { label: "VPA / UPI ID", value: record.vpa || record.upiId || "—" },
          { label: "Transaction ID", value: record.transactionId || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          {
            label: "Settlement Status",
            value:
              record.settled === true
                ? "Settled"
                : record.settled === false
                  ? "Pending"
                  : "—",
          },
          {
            label: "Review Status",
            value: record.reviewStatus || record.status || "—",
          },
          {
            label: "Date",
            value: record.date ? new Date(record.date).toLocaleString() : "—",
          },
        ];

      case "bank":
        return [
          { label: "Account Number", value: record.accountNo || "—" },
          { label: "Transaction ID", value: record.transactionId || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          { label: "Account Holder", value: record.holder || "—" },
          {
            label: "Settlement Status",
            value:
              record.settled === true
                ? "Settled"
                : record.settled === false
                  ? "Pending"
                  : "—",
          },
          {
            label: "Review Status",
            value: record.reviewStatus || record.status || "—",
          },
          {
            label: "Date",
            value: record.date ? new Date(record.date).toLocaleString() : "—",
          },
        ];

      default:
        return [];
    }
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

  // Helper for pagination range
  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
      this.routeSub = null;
    }
  }

  getSelectedcomPartDomain(view: "upi" | "bank" | "payout"): string {
    let selectedId = "";

    if (view === "bank") {
      selectedId = this.bankcomPartFilter;
    }

    if (!selectedId) {
      return "All Compart";
    }

    const found = this.comPartOptions.find((p) => p.id === selectedId);

    return found?.domain || "All Compart";
  }
  onModeChange(mode: "upi" | "bank") {
    this.selectedMode = mode;

    this.payinPage = 0;

    this.refreshCurrentView();
  }
  onStatusChange(status: "ACCEPTED" | "REJECTED" | "PENDING") {
    this.selectedStatus = status;

    this.payinPage = 0;

    this.refreshCurrentView();
  }
  resetPages() {
    this.payinPage = 0;
  }
  getFundType(): string {
    if (this.selectedMode === "upi") return "UPI";

    if (this.selectedMode === "bank") return "BANK";

    return "ALL";
  }

  //new
  openChatModal(record: any) {
    if (!record) {
      return;
    }

    this.selectedRecord = record;

    this.showChatModal = true;

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

    if (!entityId || !entityType || !fundId) {
      return;
    }

    this.loadingThreads = true;

    this.fundService
      .getThreadByEntityIdTypeAndFund(
        entityId,
        entityType,
        fundId,
        this.selectedMode,
      )
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
          this.snackbar.show(
            err.error.message || "failed to laod thread",
            false,
          );

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

    //
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
