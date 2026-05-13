
import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { FundsService } from "../../pages/services/funds.service";
import { UserStateService } from "../../store/user-state.service";
import { MultimediaService } from "../../pages/services/multimedia.service";
import { catchError, of, Subscription } from "rxjs";
import { DateTimeUtil } from "../../utils/date-time.utils";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ComPartService } from "../../pages/services/com-part.service";

@Component({
  selector: "app-hb-payout-report",

  templateUrl: "./hb-payout-report.component.html",
  styleUrl: "./hb-payout-report.component.css",
})
export class HbPayoutReportComponent implements OnInit, OnDestroy {
  approvedpayouts: any[] = [];

  payoutTotalRecords = 0;

  branchId: string | null = null;
  userId: string | null = null;
  role: string | null = "";

  selectedStatus: string = "APPROVED";

  private routeSub: Subscription | null = null;

  // active view
  activeView: any;
  imageError = false;

  allRejectedPayouts: any[] = [];
  // Payout filters
  payoutSearchQuery = "";
  payoutPortalFilter = "";
  payoutDateFrom = "";
  payoutDateTo = "";
  payoutPortals: any[] = [];

  // ========== PAGINATION (client‑side) ==========

  payoutApprovedPage = 0;
  payoutApprovedPageSize = 10;
  payoutApprovedPageSizes = [10, 20, 25, 50];
  portalOptions: { id: string; domain: string }[] = [];
  // ========== FILTER DROPDOWN STATE ==========
  filterDropdownOpen: string | null = null;

  // ========== CUSTOM PORTAL DROPDOWN STATE ==========

  payoutPortalDropdownOpen = false;

  // ========== MODAL & LIGHTBOX STATE ==========
  showRecordModal = false;
  selectedRecord: any = null;
  lightboxImage: string | null = null;

  // Colors based on role (already in template via data-role)
  colors: any = null;
  headPortals: any[] = [];
  constructor(
    private route: ActivatedRoute,
    private fundService: FundsService,
    private userStateService: UserStateService,
    private multimediaService: MultimediaService,
    private snackbar: SnackbarService,
    private compartService: ComPartService,
  ) {}

  ngOnInit(): void {
    this.branchId = this.userStateService.getCurrentEntityId();
    this.userId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    //  default status
    this.selectedStatus = "ACCEPTED";

    this.setColorsByRole();

    //  load portals
    this.loadAllComparts();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const type = params.get("type") as "payout" | null;

      //  only payout view
      this.activeView = type || "payout";

      if (!this.branchId) return;

      //  always call API
      // this.fetchAllRejectedPayouts();
    });
  }

  loadAllComparts(): void {
    if (!this.branchId || !this.role) return;

    let apiCall$;

    apiCall$ = this.compartService.getPercentageByEntityId(
      this.branchId,
      this.role,
    );

    apiCall$
      .pipe(
        catchError(() => {
          this.portalOptions = [];

          this.payoutPortals = [];
          this.snackbar.show("Failed to load portals", false);
          return of([]);
        }),
      )
      .subscribe((response: any) => {
        const portalsData = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        const uniqueMap = new Map<string, any>();

        portalsData.forEach((item: any) => {
          if (item?.compartId && item?.compartUsername) {
            uniqueMap.set(item.compartId, {
              id: item.compartId,
              domain: item.compartUsername,
            });
          }
        });

        const portals = Array.from(uniqueMap.values());

        //  single source of truth
        this.portalOptions = portals;

        this.payoutPortals = portals;
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

  // fetchAllRejectedPayouts(): void {
  //   if (!this.branchId) return;

  //   const pageSize = 10;
  //   let page = 0;

  //   const allData: any[] = [];

  //   const fetchPage = () => {
  //     const fromDate = this.payoutDateFrom
  //       ? DateTimeUtil.toUtcISOString(
  //           new Date(new Date(this.payoutDateFrom).setHours(0, 0, 0, 0)),
  //         )
  //       : undefined;

  //     const toDate = this.payoutDateTo
  //       ? DateTimeUtil.toUtcISOString(
  //           new Date(new Date(this.payoutDateTo).setHours(23, 59, 59, 999)),
  //         )
  //       : undefined;

  //     this.fundService
  //       .getAllPayoutFundWithEntityAndCpId(
  //         this.branchId,
  //         this.payoutPortalFilter || undefined,
  //         this.selectedStatus,
  //         page,
  //         pageSize,
  //         undefined,
  //         fromDate,
  //         toDate,
  //         this.role,
  //       )
  //       .pipe(
  //         catchError((err) => {


  //           this.snackbar.show("Failed to load payouts", false);

  //           return of({
  //             data: [],
  //             total: 0,
  //           });
  //         }),
  //       )
  //       .subscribe((response: any) => {


  //         const list = this.extractListFromResponse(response);

  //         allData.push(...list);

  //         const total = this.extractTotalFromResponse(response);

  //         if ((page + 1) * pageSize < total) {
  //           page++;
  //           fetchPage();
  //         } else {
  //           // ✅ save original
  //           this.allRejectedPayouts = allData;

  //           // ✅ map for UI
  //           this.mapPayoutArray(allData);

  //           // ✅ total count
  //           this.payoutTotalRecords = allData.length;
  //         }
  //       });
  //   };

  //   fetchPage();
  // }

  fetchAllRejectedPayouts(): void {
    if (!this.branchId) return;

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

    this.fundService
      .getAllPayoutFundWithEntityAndCpId(
        this.branchId,
        this.payoutPortalFilter || undefined,
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
    if (!this.branchId) return;

    this.fundService
      .getAllpayoutTrueFalseBybranchIdPaginate(
        this.branchId,
        "REJECTED", // changed from ACCEPTED to REJECTED
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

  // ============ MAPPERS ============

  private mapPayoutArray(items: any[]) {
    this.approvedpayouts = items.map((it: any) => ({
      mode: "payout",
      userId: it.userId,
      accountNo: it.accountNo || it.raw?.accountNo || it.accNo || "-",
      ifscCode: it.ifsc,
      holder: it.holder,
      amount: Number(it.currencyWiseAmount ?? it.amount ?? it.value ?? 0),
      status: it.status || it.state || "REJECTED", // default to REJECTED
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
    }));
    this.approvedpayouts.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );
  }

  filteredApprovedpayouts(): any[] {
    return this.approvedpayouts;
  }

  pagedApprovedpayouts(): any[] {
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

  // ============ PORTAL DROPDOWN CONTROLS ============
  togglePortalDropdown(view: "upi" | "bank" | "payout") {
    if (view === "payout") {
      this.payoutPortalDropdownOpen = !this.payoutPortalDropdownOpen;
    }
  }

  selectPortal(view: "upi" | "bank" | "payout", portal: any) {
    const portalId = portal?.id || "";

    if (view === "payout") {
      this.payoutPortalFilter = portalId;

      // ✅ close dropdown
      this.payoutPortalDropdownOpen = false;

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

  // clearPayoutFilters() {
  //   this.payoutSearchQuery = "";
  //   this.payoutPortalFilter = "";
  //   this.payoutDateFrom = "";
  //   this.payoutDateTo = "";
  //   this.payoutApprovedPage = 0;
  //   this.fetchApprovedPayouts();
  //   this.filterDropdownOpen = null;
  // }
  clearPayoutFilters() {
    this.payoutSearchQuery = "";
    this.payoutPortalFilter = "";
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

  // getImageUrl(rec: any): string | null {
  //   if (!rec) return null;
  //   const raw = rec.raw || {};
  //   const fp = `${fileBaseUrl}/${raw.rejectionFilePath}`;
  //   if (!fp) return null;
  //   const trimmed = ("" + fp).trim();
  //   if (!trimmed || trimmed.toLowerCase().includes("null")) return null;
  //   if (/^https?:\/\//i.test(trimmed)) return trimmed;
  //   try {
  //     // return `${window.location.origin}${trimmed.startsWith("/") ? trimmed : "/" + trimmed}`;
  //     return `${location.origin}${trimmed.startsWith("/") ? trimmed : "/" + trimmed}`;
  //   } catch (e) {
  //     return trimmed;
  //   }
  // }
  loadImages(rec: any) {
    if (!rec) return;

    const raw = rec.raw || {};

    rec.images = [];
    this.imageError = false;

    // ✅ alag-alag handle karo (clear logic)
    const paths = [];

    if (
      raw.filePath &&
      raw.filePath !== "null" &&
      raw.filePath !== "undefined" &&
      raw.filePath.trim() !== ""
    ) {
      paths.push(raw.filePath);
    }

    if (
      raw.rejectionFilePath &&
      raw.rejectionFilePath !== "null" &&
      raw.rejectionFilePath !== "undefined" &&
      raw.rejectionFilePath.trim() !== ""
    ) {
      paths.push(raw.rejectionFilePath);
    }

    // ❌ agar dono nahi hai
    if (paths.length === 0) {
      rec.images = [];
      return;
    }

    // ✅ API call for each
    paths.forEach((id: string) => {
      this.multimediaService.getPrivateImage(id).subscribe({
        next: (url) => {
          rec.images.push(url);
        },
        error: () => {
          this.imageError = true;
        },
      });
    });
  }

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
          {
            label: "Portal",
            value: record.portal || record.raw?.portalDomain || "—",
          },
          { label: "VPA / UPI ID", value: record.vpa || record.upiId || "—" },
          { label: "Transaction ID", value: record.transactionId || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          { label: "Query Text", value: record.queryText || "—" },

          {
            label: "Settlement Status",
            value:
              record.settled === true
                ? "Settled"
                : record.settled === false
                  ? "Pending"
                  : "—",
          },
          // {
          //   label: "Review Status",
          //   value: record.reviewStatus || record.status || "—",
          // },
          {
            label: "Date",
            value: record.date ? new Date(record.date).toLocaleString() : "—",
          },
        ];

      case "bank":
        return [
          {
            label: "Portal",
            value: record.portal || record.raw?.portalDomain || "—",
          },
          { label: "Account Number", value: record.accountNo || "—" },
          { label: "Transaction ID", value: record.transactionId || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          { label: "Account Holder", value: record.holder || "—" },
          { label: "Query Text", value: record.queryText || "—" },

          {
            label: "Settlement Status",
            value:
              record.settled === true
                ? "Settled"
                : record.settled === false
                  ? "Pending"
                  : "—",
          },
          // {
          //   label: "Review Status",
          //   value: record.reviewStatus || record.status || "—",
          // },
          {
            label: "Date",
            value: record.date ? new Date(record.date).toLocaleString() : "—",
          },
        ];

      case "payout":
        return [
          { label: "Portal", value: record.portalDomain || "—" },
          { label: "User ID", value: record.userId || "—" },
          { label: "Account Number", value: record.accountNo || "—" },
          { label: "IFSC Code", value: record.ifscCode || "—" },
          { label: "Account Holder", value: record.holder || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          { label: "Status", value: record.status || "—" },
          // { label: "Review Status", value: record.reviewStatus || "—" },
          { label: "Remarks", value: record.remarks || "—" },
          { label: "Query Text", value: record.queryText || "—" },
          // {
          //   label: "Rejection File Path",
          //   value: record.rejectionFilePath || "—",
          // },
          {
            label: "Date",
            value: record.date ? new Date(record.date).toLocaleString() : "—",
          },
        ];

      default:
        return [];
    }
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
      this.routeSub = null;
    }
  }

  refreshCurrentView(): void {
    if (!this.branchId) return;

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

  getSelectedPortalDomain(view: "upi" | "bank" | "payout"): string {
    let selectedId = "";

    if (view === "payout") selectedId = this.payoutPortalFilter;

    const found = this.portalOptions.find((p) => p.id === selectedId);

    return found ? found.domain : "All Comparts";
  }
  onStatusChange(status: string) {
    this.selectedStatus = status;

    // ✅ reset page
    this.payoutApprovedPage = 0;

    // ✅ API call
    this.fetchAllRejectedPayouts();
  }
}
