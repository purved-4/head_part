import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { of, Subscription } from "rxjs";
import { catchError } from "rxjs/operators";
import { FundsService } from "../../pages/services/funds.service";
import { UserStateService } from "../../store/user-state.service";
import { HeadService } from "../../pages/services/head.service";
import { MultimediaService } from "../../pages/services/multimedia.service";
import { DateTimeUtil } from "../../utils/date-time.utils";
import { BranchService } from "../../pages/services/branch.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ComPartService } from "../../pages/services/com-part.service";

@Component({
  selector: "app-hb-payin-report",

  templateUrl: "./hb-payin-report.component.html",
  styleUrl: "./hb-payin-report.component.css",
})
export class HbPayinReportComponent implements OnInit, OnDestroy {
  // Arrays for each type (server returns paginated data)
  upipayins: any[] = [];
  bankpayins: any[] = [];
  approvedpayouts: any[] = [];

  // Pagination metadata from server
  upiTotalRecords = 0;
  bankTotalRecords = 0;
  payoutTotalRecords = 0;

  // Mode filter
  selectedMode: "all" | "upi" | "bank" = "all";

  // Status filter
  selectedStatus: "ACCEPTED" | "REJECTED" | "PENDING" = "ACCEPTED";

  // route + user ids
  branchId: string | null = null;
  userId: string | null = null;
  role: string | null = "";

  private routeSub: Subscription | null = null;
  imageError = false;
  // active view
  activeView: "upi" | "bank" | "payout" = "upi";

  // ========== FILTER PROPERTIES (client‑side) ==========
  // UPI filters
  upiSearchQuery = "";
  upiPortalFilter = "";
  upiDateFrom = "";
  upiDateTo = "";
  upiPortals: any[] = [];

  // Bank filters
  bankSearchQuery = "";
  bankPortalFilter = "";
  bankDateFrom = "";
  bankDateTo = "";
  bankPortals: any[] = [];

  // Payout filters
  payoutSearchQuery = "";
  payoutPortalFilter = "";
  payoutDateFrom = "";
  payoutDateTo = "";
  payoutPortals: any[] = [];

  // ========== PAGINATION ==========
  upiPage = 0;
  upiPageSize = 10;
  upiPageSizes = [5, 10, 20, 25, 50];

  bankPage = 0;
  bankPageSize = 10;
  bankPageSizes = [5, 10, 20, 25, 50];

  payoutApprovedPage = 0;
  payoutApprovedPageSize = 10;
  payoutApprovedPageSizes = [5, 10, 20, 25, 50];

  // ========== FILTER DROPDOWN STATE ==========
  filterDropdownOpen: string | null = null; // 'upi' | 'bank' | 'payout' | null

  // ========== CUSTOM PORTAL DROPDOWN STATE ==========
  upiPortalDropdownOpen = false;
  bankPortalDropdownOpen = false;
  payoutPortalDropdownOpen = false;

  // ========== MODAL & LIGHTBOX STATE ==========
  showRecordModal = false;
  selectedRecord: any = null;
  lightboxImage: string | null = null;
  isRefreshing = false;

  // Colors based on role (already in template via data-role)
  colors: any = null;
  portalOptions: { id: string; domain: string }[] = [];
  constructor(
    private route: ActivatedRoute,
    private fundService: FundsService,
    private userStateService: UserStateService,
    private headServices: HeadService,
    private multimediaService: MultimediaService,
    private branchService: BranchService,
    private snackbar: SnackbarService,
    private comPartService: ComPartService,
  ) {}
  ngOnInit(): void {
    this.branchId = this.userStateService.getCurrentEntityId();
    this.userId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.setColorsByRole();

    if (this.branchId) {
      this.loadPortalOptions();
    }

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const type = params.get("type") as "upi" | "bank" | "payout" | null;

      this.activeView = type === "bank" || type === "payout" ? type : "upi";

      if (!this.branchId) return;

      // ✅ ALWAYS LOAD DATA
      if (this.activeView === "upi") {
        this.fetchUpiPayins();
      } else if (this.activeView === "bank") {
        this.fetchBankPayins();
      } else {
      }
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

  fetchUpiPayins(): void {
    if (!this.branchId) return;

    const fromDate = this.upiDateFrom
      ? DateTimeUtil.toUtcISOString(
          new Date(new Date(this.upiDateFrom).setHours(0, 0, 0, 0)),
        )
      : undefined;

    const toDate = this.upiDateTo
      ? DateTimeUtil.toUtcISOString(
          new Date(new Date(this.upiDateTo).setHours(23, 59, 59, 999)),
        )
      : undefined;

    // ✅ FIXED
    const portalId =
      this.upiPortalFilter && this.upiPortalFilter !== ""
        ? this.upiPortalFilter
        : undefined;

    this.fundService
      .getPayinFundWithPortalIdAndEntityId(
        this.branchId,
        portalId,
        this.selectedStatus,
        this.upiPage,
        this.upiPageSize,
        undefined,
        fromDate,
        toDate,
        "UPI",
      )
      .pipe(catchError(() => of({ content: [], totalElements: 0 })))
      .subscribe((response: any) => {
        const { list, total, pageNum, pageSize } = this.parseResponse(response);

        this.upiTotalRecords = total;
        this.upiPage = pageNum;
        this.upiPageSize = pageSize;

        this.mapFundsArray(list, "upi");
      });
  }
  fetchBankPayins(): void {
    if (!this.branchId) return;

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

    const portalId =
      this.bankPortalFilter && this.bankPortalFilter !== ""
        ? this.bankPortalFilter
        : undefined;

    this.fundService
      .getPayinFundWithCpIdAndEntityId(
        this.branchId,
        portalId,
        this.selectedStatus,
        this.bankPage, // ✅ FIXED
        this.bankPageSize,
        undefined,
        fromDate,
        toDate,
        "BANK",
        this.role,
      )
      .pipe(catchError(() => of({ content: [], totalElements: 0 })))
      .subscribe((response: any) => {
        const { list, total, pageNum, pageSize } = this.parseResponse(response);

        this.bankTotalRecords = total;
        this.bankPage = pageNum;
        this.bankPageSize = pageSize;

        this.mapFundsArray(list, "bank");
      });
  }

  // fetchApprovedPayouts(): void {
  //   if (!this.branchId) return;

  //   const fromDate = this.payoutDateFrom
  //     ? DateTimeUtil.toUtcISOString(
  //         new Date(new Date(this.payoutDateFrom).setHours(0, 0, 0, 0)),
  //       )
  //     : undefined;

  //   const toDate = this.payoutDateTo
  //     ? DateTimeUtil.toUtcISOString(
  //         new Date(new Date(this.payoutDateTo).setHours(23, 59, 59, 999)),
  //       )
  //     : undefined;

  //   const portalId =
  //     this.payoutPortalFilter && this.payoutPortalFilter !== ""
  //       ? this.payoutPortalFilter
  //       : undefined;

  //   this.fundService
  //     .getAllPayoutFundWithEntityAndPortalId(
  //       this.branchId,
  //       portalId,
  //       this.selectedStatus,
  //       this.payoutApprovedPage, // ✅ FIXED
  //       this.payoutApprovedPageSize,
  //       undefined,
  //       fromDate,
  //       toDate,
  //     )
  //     .pipe(
  //       catchError(() => {
  //         return of({ content: [], totalElements: 0 });
  //       }),
  //     )
  //     .subscribe((response: any) => {
  //       const { list, total, pageNum, pageSize } = this.parseResponse(response);

  //       this.payoutTotalRecords = total;
  //       this.payoutApprovedPage = pageNum;
  //       this.payoutApprovedPageSize = pageSize;

  //       this.mapPayoutArray(list);
  //     });
  // }

  loadPortalOptions(): void {
    if (!this.branchId) return;

    const role = (this.role || "").toLowerCase();

    this.comPartService
      .getPercentageByEntityId(this.branchId, this.role)
      .subscribe({
        next: (res: any) => {
          const source = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];

          const uniqueMap = new Map<string, any>();
          console.log(source);
          source.forEach((item: any) => {
            if (item?.compartId && item?.compartUsername) {
              uniqueMap.set(item.compartId, {
                id: item.compartId,
                domain: item.compartUsername,
              });
            }
          });

          this.setPortals(Array.from(uniqueMap.values()));
        },
        error: () => {
          this.setPortals([]);
        },
      });
  }
  private setPortals(portals: any[]) {
    this.portalOptions = portals;

    this.upiPortals = portals;
    this.bankPortals = portals;
    this.payoutPortals = portals;
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
    const targetArray = mode === "bank" ? this.bankpayins : this.upipayins;
    targetArray.length = 0;

    items.forEach((it: any) => {
      const normalized = {
        mode: mode,

        portal: it.portalDomain || it.portalId || "—",
        portalId: it.portalId || it.raw?.portalId || null,

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
      };

      targetArray.push(normalized);
    });

    targetArray.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );
  }

  private mapPayoutArray(items: any[]) {
    this.approvedpayouts = items.map((it: any) => ({
      mode: "payout",
      userId: it.userId,
      accountNo: it.accountNo || it.raw?.accountNo || it.accNo || "-",
      ifscCode: it.ifsc,
      holder: it.holder,
      amount: Number(it.currencyWiseAmount ?? it.amount ?? it.value ?? 0),
      status: it.status || it.state || "ACCEPTED",
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

  // ============ FILTERED ARRAYS (client‑side) ============
  filteredUpipayins(): any[] {
    return this.upipayins.filter((item) => {
      // SEARCH
      if (this.upiSearchQuery) {
        const query = this.upiSearchQuery.toLowerCase();

        const searchFields = [
          item.vpa,
          item.upiId,
          item.transactionId,
          item.portal,
          item.accountNo,
        ]
          .filter(Boolean)
          .map((f) => f.toString().toLowerCase());

        if (!searchFields.some((f) => f.includes(query))) {
          return false;
        }
      }

      // PORTAL FILTER (FIXED)
      if (
        this.upiPortalFilter &&
        (item.portalId || item.raw?.portalId) !== this.upiPortalFilter
      ) {
        return false;
      }

      // DATE FILTER
      const itemDate = new Date(item.date);

      if (this.upiDateFrom) {
        const from = new Date(this.upiDateFrom);
        from.setHours(0, 0, 0, 0);
        if (itemDate < from) return false;
      }

      if (this.upiDateTo) {
        const to = new Date(this.upiDateTo);
        to.setHours(23, 59, 59, 999);
        if (itemDate > to) return false;
      }

      return true;
    });
  }

  filteredBankpayins(): any[] {
    return this.bankpayins.filter((item) => {
      // SEARCH
      if (this.bankSearchQuery) {
        const query = this.bankSearchQuery.toLowerCase();

        const searchFields = [
          item.accountNo,
          item.transactionId,
          item.portal,
          item.raw?.bankAccountHolderName,
        ]
          .filter(Boolean)
          .map((f) => f.toString().toLowerCase());

        if (!searchFields.some((f) => f.includes(query))) {
          return false;
        }
      }

      // PORTAL FILTER (FIXED)
      if (
        this.bankPortalFilter &&
        (item.portalId || item.raw?.portalId) !== this.bankPortalFilter
      ) {
        return false;
      }

      // DATE FILTER
      const itemDate = new Date(item.date);

      if (this.bankDateFrom) {
        const from = new Date(this.bankDateFrom);
        from.setHours(0, 0, 0, 0);
        if (itemDate < from) return false;
      }

      if (this.bankDateTo) {
        const to = new Date(this.bankDateTo);
        to.setHours(23, 59, 59, 999);
        if (itemDate > to) return false;
      }

      return true;
    });
  }

  filteredApprovedpayouts(): any[] {
    return this.approvedpayouts.filter((item) => {
      // SEARCH
      if (this.payoutSearchQuery) {
        const query = this.payoutSearchQuery.toLowerCase();

        const searchFields = [
          item.accountNo,
          item.ifscCode,
          item.holder,
          item.portalDomain,
        ]
          .filter(Boolean)
          .map((f) => f.toString().toLowerCase());

        if (!searchFields.some((f) => f.includes(query))) {
          return false;
        }
      }

      // PORTAL FILTER (FIXED)
      if (
        this.payoutPortalFilter &&
        (item.raw?.portalId || item.portalId) !== this.payoutPortalFilter
      ) {
        return false;
      }

      // DATE FILTER
      const itemDate = new Date(item.date);

      if (this.payoutDateFrom) {
        const from = new Date(this.payoutDateFrom);
        from.setHours(0, 0, 0, 0);
        if (itemDate < from) return false;
      }

      if (this.payoutDateTo) {
        const to = new Date(this.payoutDateTo);
        to.setHours(23, 59, 59, 999);
        if (itemDate > to) return false;
      }

      return true;
    });
  }

  // ============ PAGINATED ARRAYS ============
  pagedUpipayins(): any[] {
    const filtered = this.filteredUpipayins();

    const start = this.upiPage * this.upiPageSize;
    const end = start + this.upiPageSize;

    // 🔥 IMPORTANT: always safe slice on filtered only
    return filtered.slice(start, end);
  }

  upiTotalPages(): number {
    return Math.ceil(this.filteredUpipayins().length / this.upiPageSize);
  }

  pagedBankpayins(): any[] {
    const filtered = this.filteredBankpayins();

    const start = this.bankPage * this.bankPageSize;
    const end = start + this.bankPageSize;

    return filtered.slice(start, end);
  }

  bankTotalPages(): number {
    return Math.ceil(this.filteredBankpayins().length / this.bankPageSize);
  }

  pagedApprovedpayouts(): any[] {
    const filtered = this.filteredApprovedpayouts();

    const start = this.payoutApprovedPage * this.payoutApprovedPageSize;
    const end = start + this.payoutApprovedPageSize;

    return filtered.slice(start, end);
  }

  payoutApprovedTotalPages(): number {
    return Math.ceil(
      this.filteredApprovedpayouts().length / this.payoutApprovedPageSize,
    );
  }

  // ============ PAGINATION CONTROLS ============
  setUpiPage(p: number) {
    const totalPages = this.upiTotalPages();
    this.upiPage = Math.max(0, Math.min(p, totalPages - 1));
  }

  setBankPage(p: number) {
    const totalPages = this.bankTotalPages();
    this.bankPage = Math.max(0, Math.min(p, totalPages - 1));
  }

  setpayoutApprovedPage(p: number) {
    const totalPages = this.payoutApprovedTotalPages();
    this.payoutApprovedPage = Math.max(0, Math.min(p, totalPages - 1));
  }

  onChangeUpiPageSize(size: number) {
    this.upiPageSize = Number(size);
    this.upiPage = 0;
  }

  onChangeBankPageSize(size: number) {
    this.bankPageSize = Number(size);
    this.bankPage = 0;
  }

  onChangepayoutApprovedPageSize(size: number) {
    this.payoutApprovedPageSize = Number(size);
    this.payoutApprovedPage = 0;
  }

  // ============ FILTER DROPDOWN CONTROLS ============
  toggleFilterDropdown(view: string) {
    this.filterDropdownOpen = this.filterDropdownOpen === view ? null : view;
  }

  get upiFilterActive(): boolean {
    return !!(this.upiDateFrom || this.upiDateTo);
  }

  get bankFilterActive(): boolean {
    return !!(this.bankDateFrom || this.bankDateTo);
  }

  get payoutFilterActive(): boolean {
    return !!(this.payoutDateFrom || this.payoutDateTo);
  }

  clearUpiDateFilters() {
    this.upiDateFrom = "";
    this.upiDateTo = "";
  }

  clearBankDateFilters() {
    this.bankDateFrom = "";
    this.bankDateTo = "";
  }

  clearPayoutDateFilters() {
    this.payoutDateFrom = "";
    this.payoutDateTo = "";
  }

  // ============ PORTAL DROPDOWN CONTROLS ============
  togglePortalDropdown(view: "upi" | "bank" | "payout") {
    if (view === "upi") {
      this.upiPortalDropdownOpen = !this.upiPortalDropdownOpen;
      this.bankPortalDropdownOpen = false;
      this.payoutPortalDropdownOpen = false;
    } else if (view === "bank") {
      this.bankPortalDropdownOpen = !this.bankPortalDropdownOpen;
      this.upiPortalDropdownOpen = false;
      this.payoutPortalDropdownOpen = false;
    } else if (view === "payout") {
      this.payoutPortalDropdownOpen = !this.payoutPortalDropdownOpen;
      this.upiPortalDropdownOpen = false;
      this.bankPortalDropdownOpen = false;
    }
  }

  selectPortal(view: "upi" | "bank" | "payout", portal: any) {
    const portalId = portal?.id || "";

    if (view === "upi") {
      this.upiPortalFilter = portalId;
      this.upiPortalDropdownOpen = false;
      this.upiPage = 0;
      this.fetchUpiPayins();
    } else if (view === "bank") {
      this.bankPortalFilter = portalId;
      this.bankPortalDropdownOpen = false;
      this.bankPage = 0;
      this.fetchBankPayins();
    } else {
      this.payoutPortalFilter = portalId;
      this.payoutPortalDropdownOpen = false;
      this.payoutApprovedPage = 0;
    }
  }

  // ============ FILTER TRIGGERS ============
  applyUpiFilters() {
    this.upiPage = 0;
    if (this.upiPortalFilter) {
      this.fetchUpiPayins();
    }
  }

  applyUpiFiltersAndClose() {
    this.applyUpiFilters();
    this.filterDropdownOpen = null;
  }

  clearUpiFilters() {
    this.upiSearchQuery = "";
    this.upiPortalFilter = "";
    this.upiDateFrom = "";
    this.upiDateTo = "";
    this.upiPage = 0;
    this.fetchUpiPayins();
    this.filterDropdownOpen = null;
  }

  applyBankFilters() {
    this.bankPage = 0;
    if (this.bankPortalFilter) {
      this.fetchBankPayins();
    }
  }

  applyBankFiltersAndClose() {
    this.applyBankFilters();
    this.filterDropdownOpen = null;
  }

  clearBankFilters() {
    this.bankSearchQuery = "";
    this.bankPortalFilter = "";
    this.bankDateFrom = "";
    this.bankDateTo = "";

    this.bankPage = 0;
    this.fetchBankPayins(); // ✅ REQUIRED
  }

  applyPayoutFilters() {
    this.payoutApprovedPage = 0;
    if (this.payoutPortalFilter) {
    }
  }

  applyPayoutFiltersAndClose() {
    this.applyPayoutFilters();
    this.filterDropdownOpen = null;
  }

  clearPayoutFilters() {
    this.payoutSearchQuery = "";
    this.payoutPortalFilter = "";
    this.payoutDateFrom = "";
    this.payoutDateTo = "";
    this.payoutApprovedPage = 0;
    this.filterDropdownOpen = null;
  }

  // ============ REFRESH BUTTON ============
  refreshCurrentView(): void {
    if (this.activeView === "upi") {
      this.fetchUpiPayins();
    } else if (this.activeView === "bank") {
      this.fetchBankPayins();
    } else {
    }
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
  openRecordModal(record: any) {
    this.selectedRecord = record;
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

  loadImages(rec: any) {
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
          {
            label: "Portal",
            value: record.portal || record.raw?.portalDomain || "—",
          },
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

      case "payout":
        return [
          { label: "Portal", value: record.portalDomain || "—" },
          { label: "User ID", value: record.userId || "—" },
          { label: "Account Number", value: record.accountNo || "—" },
          { label: "IFSC Code", value: record.ifscCode || "—" },
          { label: "Account Holder", value: record.holder || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          { label: "Status", value: record.status || "—" },
          { label: "Review Status", value: record.reviewStatus || "—" },
          { label: "Remarks", value: record.remarks || "—" },
          { label: "Query Text", value: record.queryText || "—" },
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

  getSelectedPortalDomain(view: "upi" | "bank" | "payout"): string {
    let selectedId = "";

    if (view === "upi") selectedId = this.upiPortalFilter;
    else if (view === "bank") selectedId = this.bankPortalFilter;
    else selectedId = this.payoutPortalFilter;

    const found = this.portalOptions.find((p) => p.id === selectedId);
    return found ? found.domain : "All Compart";
  }
  onModeChange(mode: "all" | "upi" | "bank") {
    this.selectedMode = mode;

    this.upiPage = 0;
    this.bankPage = 0;
    this.payoutApprovedPage = 0;

    this.refreshCurrentView();
  }
  onStatusChange(status: "ACCEPTED" | "REJECTED" | "PENDING") {
    this.selectedStatus = status;

    this.upiPage = 0;
    this.bankPage = 0;
    this.payoutApprovedPage = 0;

    this.refreshCurrentView();
  }
  resetPages() {
    this.upiPage = 0;
    this.bankPage = 0;
    this.payoutApprovedPage = 0;
  }
  getFundType(): string {
    if (this.selectedMode === "upi") return "UPI";

    if (this.selectedMode === "bank") return "BANK";

    return "ALL";
  }
}
