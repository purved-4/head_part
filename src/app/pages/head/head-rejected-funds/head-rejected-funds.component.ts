import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { forkJoin, of, Subscription } from "rxjs";
import { catchError } from "rxjs/operators";
import { BranchService } from "../../services/branch.service";
import { FundsService } from "../../services/funds.service";
import { AuthService } from "../../services/auth.service";
import { SocketConfigService } from "../../../common/socket/socket-config.service";
import { UserStateService } from "../../../store/user-state.service";
import { fileBaseUrl } from "../../services/helper";

@Component({
  selector: "app-head-rejected-funds",
  templateUrl: "./head-rejected-funds.component.html",
  styleUrls: ["./head-rejected-funds.component.css"],
})
export class HeadRejectedFundsComponent implements OnInit, OnDestroy {
  // Separate arrays for UPI and Bank topups
  upitopups: any[] = [];
  banktopups: any[] = [];
  approvedpayouts: any[] = [];

  // Pagination metadata
  upiTotalRecords = 0;
  bankTotalRecords = 0;
  payoutTotalRecords = 0;

  // Loading states for skeletons
  isLoadingUpitopups = false;
  isLoadingBanktopups = false;
  isLoadingPayouts = false;

  // route + user ids
  branchId: string | null = null;
  userId: string | null = null;

  // route subscription
  private routeSub: Subscription | null = null;
  private querySub: Subscription | null = null;

  // search strings for each table
  upiSearchQuery = "";
  bankSearchQuery = "";
  payoutSearchQuery = "";

  // pagination state for UPI topups
  upiPage = 0;
  upiPageSize = 10;
  upiPageSizes = [10, 20, 25, 50];

  // pagination state for Bank topups
  bankPage = 0;
  bankPageSize = 10;
  bankPageSizes = [10, 20, 25, 50];

  activeView: "upi" | "bank" | "payout" = "upi";

  // pagination state for payouts
  payoutApprovedPage = 0;
  payoutApprovedPageSize = 10;
  payoutApprovedPageSizes = [10, 20, 25, 50];

  // modal state
  showRecordModal = false;
  selectedRecord: any | null = null;
  role: string | null = "";
  colors: any = null;

  // Modal tabs and zoom
  activeTab: "details" | "raw" = "details";
  zoomImage = false;

  constructor(
    private route: ActivatedRoute,
    private BranchService: BranchService,
    private fundService: FundsService,
    private authService: AuthService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.branchId = this.userStateService.getCurrentRoleId();
    this.userId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const type = params.get("type") as "upi" | "bank" | "payout" | null;

      // fallback if invalid or missing
      this.activeView = type === "bank" || type === "payout" ? type : "upi";

      if (!this.branchId) return;

      // fetch based on route
      if (this.activeView === "upi") {
        this.fetchUpiTopups();
      } else if (this.activeView === "bank") {
        this.fetchBankTopups();
      } else {
        this.fetchApprovedPayouts();
      }
    });
    this.setColorsByRole();
  }

  setColorsByRole() {
    const head = {
      primary: "#E67A00",
      secondary: "#FFB366",
      bg: "#FFF9F2",
      font: "#1F2937",
      font2: "#FFFFFF",
      border: "#CC6A00",
      hover: "#FF8A1A",
      glow: "rgba(230,122,0,0.50)",
    };
    const branch = {
      primary: "#FFC61A",
      secondary: "#FFE699",
      bg: "#FFFDF2",
      font: "#1F2937",
      font2: "#1F2937",
      border: "#E6B800",
      hover: "#FFD54F",
      glow: "rgba(255,198,26,0.50)",
    };

    // default to branch if role not recognized
    if (!this.role) {
      this.colors = branch;
      return;
    }

    // assume role contains 'head' or 'branch' substring; adapt as needed
    const low = String(this.role).toLowerCase();
    if (low.includes("head")) {
      this.colors = head;
    } else if (low.includes("branch")) {
      this.colors = branch;
    } else {
      this.colors = branch;
    }
  }

  // ============ UPI Topups Methods ============
  fetchUpiTopups(): void {
    if (!this.branchId) return;

    this.isLoadingUpitopups = true;
    this.upitopups = [];

    this.fundService
      .getAllUpiFundWithBranchIdPaginated(
        this.branchId,
        "REJECTED",
        this.upiPage,
        this.upiPageSize,
        this.upiSearchQuery,
      )
      .pipe(
        catchError((err) => {
          console.error("UPI fetch error", err);
          return of({ data: [], total: 0 });
        }),
      )
      .subscribe((response: any) => {
        let list: any[] = [];
        let total = 0;
        let pageNum = this.upiPage;
        let pageSize = this.upiPageSize;

        // array directly
        if (Array.isArray(response)) {
          list = response;
          total = list.length;
        }
        // response.data can be array, paginated object, or spring-style
        else if (response && response.data) {
          if (Array.isArray(response.data)) {
            list = response.data;
            total = response.total ?? list.length;
          } else if (Array.isArray(response.data.content)) {
            list = response.data.content;
            total =
              response.data.totalElements ?? response.data.total ?? list.length;
            pageNum =
              typeof response.data.number === "number"
                ? response.data.number
                : pageNum;
            pageSize =
              typeof response.data.size === "number"
                ? response.data.size
                : pageSize;
          }
        }
        // sometimes backend returns paginated at top-level
        else if (response && Array.isArray(response.content)) {
          list = response.content;
          total = response.totalElements ?? response.total ?? list.length;
          pageNum =
            typeof response.number === "number" ? response.number : pageNum;
          pageSize =
            typeof response.size === "number" ? response.size : pageSize;
        } else {
          // fallback single-item or unknown shape
          list = [];
          total = 0;
        }

        this.upiTotalRecords = Number(total ?? 0);
        this.upiPage = Number(pageNum ?? 0);
        this.upiPageSize = Number(pageSize ?? this.upiPageSize);
        this.mapFundsArray(list, "upi");
        this.isLoadingUpitopups = false;
      });
  }

  // ======== Bank Topups ========
  fetchBankTopups(): void {
    if (!this.branchId) return;

    this.isLoadingBanktopups = true;
    this.banktopups = [];

    this.fundService
      .getAllBankFundWithBranchIdPaginated(
        this.branchId,
        "REJECTED",
        this.bankPage,
        this.bankPageSize,
        this.bankSearchQuery,
      )
      .pipe(
        catchError((err) => {
          console.error("Bank fetch error", err);
          return of({ data: [], total: 0 });
        }),
      )
      .subscribe((response: any) => {
        console.log(response);

        let list: any[] = [];
        let total = 0;
        let pageNum = this.bankPage;
        let pageSize = this.bankPageSize;

        if (Array.isArray(response)) {
          list = response;
          total = list.length;
        } else if (response && response.data) {
          if (Array.isArray(response.data)) {
            list = response.data;
            total = response.total ?? list.length;
          } else if (Array.isArray(response.data.content)) {
            // Spring-style payload inside response.data
            list = response.data.content;
            total =
              response.data.totalElements ?? response.data.total ?? list.length;
            pageNum =
              typeof response.data.number === "number"
                ? response.data.number
                : pageNum;
            pageSize =
              typeof response.data.size === "number"
                ? response.data.size
                : pageSize;
          } else if (Array.isArray(response.data.content)) {
            list = response.data.content;
            total = response.data.totalElements ?? list.length;
          }
        } else if (response && Array.isArray(response.content)) {
          // Spring-style payload at top-level
          list = response.content;
          total = response.totalElements ?? response.total ?? list.length;
          pageNum =
            typeof response.number === "number" ? response.number : pageNum;
          pageSize =
            typeof response.size === "number" ? response.size : pageSize;
        } else {
          list = [];
          total = 0;
        }

        this.bankTotalRecords = Number(total ?? 0);
        this.bankPage = Number(pageNum ?? 0);
        this.bankPageSize = Number(pageSize ?? this.bankPageSize);
        this.mapFundsArray(list, "bank");
        this.isLoadingBanktopups = false;
      });
  }

  // ======== Approved Payouts ========
  fetchApprovedPayouts(): void {
    if (!this.branchId) return;

    this.isLoadingPayouts = true;
    this.approvedpayouts = [];

    this.fundService
      .getAllpayoutTrueFalseBybranchIdPaginate(
        this.branchId,
        "REJECTED",
        this.payoutApprovedPage,
        this.payoutApprovedPageSize,
        this.payoutSearchQuery,
      )
      .pipe(
        catchError((err: any) => {
          console.error("Payout fetch error", err);
          return of({ data: [], total: 0 });
        }),
      )
      .subscribe((response: any) => {
        let list: any[] = [];
        let total = 0;
        let pageNum = this.payoutApprovedPage;
        let pageSize = this.payoutApprovedPageSize;

        if (Array.isArray(response)) {
          list = response;
          total = list.length;
        } else if (response && response.data) {
          if (Array.isArray(response.data)) {
            list = response.data;
            total = response.total ?? list.length;
          } else if (Array.isArray(response.data.content)) {
            list = response.data.content;
            total =
              response.data.totalElements ?? response.data.total ?? list.length;
            pageNum =
              typeof response.data.number === "number"
                ? response.data.number
                : pageNum;
            pageSize =
              typeof response.data.size === "number"
                ? response.data.size
                : pageSize;
          }
        } else if (response && Array.isArray(response.content)) {
          list = response.content;
          total = response.totalElements ?? response.total ?? list.length;
          pageNum =
            typeof response.number === "number" ? response.number : pageNum;
          pageSize =
            typeof response.size === "number" ? response.size : pageSize;
        } else {
          list = [];
          total = 0;
        }

        this.payoutTotalRecords = Number(total ?? 0);
        this.payoutApprovedPage = Number(pageNum ?? 0);
        this.payoutApprovedPageSize = Number(
          pageSize ?? this.payoutApprovedPageSize,
        );
        this.mappayoutsArray(list);
        this.isLoadingPayouts = false;
      });
  }

  switchView(view: "upi" | "bank" | "payout"): void {
    if (this.activeView === view) return;

    this.activeView = view;

    if (view === "upi") {
      this.fetchUpiTopups();
    } else if (view === "bank") {
      this.fetchBankTopups();
    } else {
      this.fetchApprovedPayouts();
    }
  }

  // Helper method for modal display fields
  getDisplayFields(record: any): any[] {
    if (!record) return [];

    return [
      { label: "Website", value: record?.website || record?.websiteId || "—" },
      { label: "Transaction Mode", value: record?.mode || "—" },
      { label: "VPA / UPI ID", value: record?.vpa || record?.upiId || "—" },
      { label: "Account Number", value: record?.accountNo || "—" },
      { label: "Transaction ID", value: record?.transactionId || "—" },
      { label: "Amount", value: `₹ ${this.formatCurrency(record?.amount)}` },
      {
        label: "Settlement Status",
        value:
          record?.settled === true
            ? "Settled"
            : record?.settled === false
              ? "Pending"
              : "—",
      },
      {
        label: "Review Status",
        value: record?.reviewStatus || record?.status || "—",
      },
    ];
  }

  // ============ Mappers ============
  private mapFundsArray(items: any[], mode: "bank" | "upi") {
    if (!Array.isArray(items)) {
      items = [];
    }

    const targetArray = mode === "bank" ? this.banktopups : this.upitopups;
    targetArray.length = 0; // Clear array

    items.forEach((it: any) => {
      const normalized = {
        mode: mode,
        website: it.website || it.domain || it.site || it.merchant || undefined,
        websiteId: it.websiteId || it.siteId || undefined,
        vpa: it.vpa || it.vpaId || it.upiId || undefined,
        upiId: it.upiId || undefined,
        accountNo: it.accountNo || it.accNo || it.account || undefined,
        transactionId: it.transactionId || it.txnId || undefined,
        amount: Number(it.amount ?? it.value ?? 0),
        settled: typeof it.settled !== "undefined" ? it.settled : undefined,
        reviewStatus: it.reviewStatus || it.review || undefined,
        status: it.status || it.state || undefined,
        date: it.createdAt
          ? new Date(it.createdAt)
          : it.date
            ? new Date(it.date)
            : it.timestamp
              ? new Date(it.timestamp)
              : new Date(),
        raw: it,
      };

      targetArray.push(normalized);
    });

    // Sort newest first
    targetArray.sort(
      (a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0),
    );
  }

  private mappayoutsArray(items: any[]) {
    if (!Array.isArray(items)) {
      items = [];
    }

    this.approvedpayouts.length = 0; // Clear array

    items.forEach((it: any) => {
      const normalized = {
        accountNo: it.accountNo || it.raw?.accountNo || it.accNo || "-",
        raw: it.raw || it,
        bankId: it.holder,
        ifscCode: it.ifsc,
        amount: Number(it.amount ?? it.value ?? 0),
        status: it.status || it.state || "REJECTED",
        date: it.createdAt
          ? new Date(it.createdAt)
          : it.date
            ? new Date(it.date)
            : it.timestamp
              ? new Date(it.timestamp)
              : new Date(),
        websiteDomain: it.websiteDomain,
      };
      this.approvedpayouts.push(normalized);
    });

    // Sort newest first
    this.approvedpayouts.sort(
      (a, b) => (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0),
    );
  }

  // ============ Template Helpers ============
  filteredUpitopups(): any[] {
    return this.upitopups;
  }

  pagedUpitopups(): any[] {
    return this.upitopups;
  }

  upiTotalPages(): number {
    return Math.max(1, Math.ceil(this.upiTotalRecords / this.upiPageSize));
  }

  filteredBanktopups(): any[] {
    return this.banktopups;
  }

  pagedBanktopups(): any[] {
    return this.banktopups;
  }

  bankTotalPages(): number {
    return Math.max(1, Math.ceil(this.bankTotalRecords / this.bankPageSize));
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

  // ============ Pagination Controls ============
  setUpiPage(p: number) {
    const total = this.upiTotalPages();
    const lastIndex = Math.max(0, total - 1);
    const newPage = Math.max(0, Math.min(p, lastIndex));
    if (newPage !== this.upiPage) {
      this.upiPage = newPage;
      this.fetchUpiTopups();
    }
  }

  setBankPage(p: number) {
    const total = this.bankTotalPages();
    const lastIndex = Math.max(0, total - 1);
    const newPage = Math.max(0, Math.min(p, lastIndex));
    if (newPage !== this.bankPage) {
      this.bankPage = newPage;
      this.fetchBankTopups();
    }
  }

  setpayoutApprovedPage(p: number) {
    const total = this.payoutApprovedTotalPages();
    const lastIndex = Math.max(0, total - 1);
    const newPage = Math.max(0, Math.min(p, lastIndex));
    if (newPage !== this.payoutApprovedPage) {
      this.payoutApprovedPage = newPage;
      this.fetchApprovedPayouts();
    }
  }

  onChangeUpiPageSize(size: number) {
    this.upiPageSize = Number(size);
    this.upiPage = 0;
    this.fetchUpiTopups();
  }

  onChangeBankPageSize(size: number) {
    this.bankPageSize = Number(size);
    this.bankPage = 0;
    this.fetchBankTopups();
  }

  onChangepayoutApprovedPageSize(size: number) {
    this.payoutApprovedPageSize = Number(size);
    this.payoutApprovedPage = 0;
    this.fetchApprovedPayouts();
  }

  // ============ Search Handlers ============
  onSearchUpitopups() {
    this.upiPage = 0;
    this.fetchUpiTopups();
  }

  onClearSearchUpitopups() {
    this.upiSearchQuery = "";
    this.upiPage = 0;
    this.fetchUpiTopups();
  }

  onSearchBanktopups() {
    this.bankPage = 0;
    this.fetchBankTopups();
  }

  onClearSearchBanktopups() {
    this.bankSearchQuery = "";
    this.bankPage = 0;
    this.fetchBankTopups();
  }

  onSearchApprovedpayouts() {
    this.payoutApprovedPage = 0;
    this.fetchApprovedPayouts();
  }

  onClearSearchApprovedpayouts() {
    this.payoutSearchQuery = "";
    this.payoutApprovedPage = 0;
    this.fetchApprovedPayouts();
  }

  // ============ Filter Reset Methods ============
  resetUpiFilters(): void {
    this.upiSearchQuery = "";
    this.upiPage = 0;
    this.fetchUpiTopups();
  }

  resetBankFilters(): void {
    this.bankSearchQuery = "";
    this.bankPage = 0;
    this.fetchBankTopups();
  }

  resetPayoutFilters(): void {
    this.payoutSearchQuery = "";
    this.payoutApprovedPage = 0;
    this.fetchApprovedPayouts();
  }

  // ============ UI Helpers ============
  formatCurrency(v: number) {
    if (v == null || isNaN(v)) return "0.00";
    return Number(v).toFixed(2);
  }

  getStatusClass(status: string) {
    const st = (status || "").toLowerCase();
    if (
      st.includes("accept") ||
      st.includes("accepted") ||
      st.includes("completed") ||
      st === "success"
    ) {
      return "bg-emerald-100 text-emerald-700";
    }
    if (st.includes("pending")) return "bg-yellow-100 text-yellow-700";
    if (
      st.includes("reject") ||
      st.includes("failed") ||
      st.includes("decline")
    )
      return "bg-rose-100 text-rose-700";
    return "bg-slate-100 text-slate-600";
  }

  // ============ Modal Methods ============
  openRecordModal(record: any) {
    this.selectedRecord = record;
    this.activeTab = "details"; // reset to details tab
    this.zoomImage = false; // reset zoom
    this.showRecordModal = true;
  }

  closeRecordModal() {
    this.selectedRecord = null;
    this.showRecordModal = false;
  }

  getImageUrl(rec: any): string | null {
    if (!rec) return null;
    const raw = rec.raw || {};
    const fp = `${fileBaseUrl}/${raw.filePath}`;

    if (!fp) return null;
    const trimmed = ("" + fp).trim();
    if (!trimmed || trimmed.toLowerCase().includes("null")) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    try {
      return `${window.location.origin}${
        trimmed.startsWith("/") ? trimmed : "/" + trimmed
      }`;
    } catch (e) {
      return trimmed;
    }
  }

  onImageError(ev: any) {
    if (ev && ev.target) {
      ev.target.src = "";
    }
  }

  // Copy raw JSON to clipboard
  copyRawToClipboard(): void {
    if (!this.selectedRecord?.raw) return;
    const rawJson = JSON.stringify(this.selectedRecord.raw, null, 2);
    navigator.clipboard
      .writeText(rawJson)
      .then(() => {
        // Optional: show a small toast or feedback
        console.log("Raw data copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
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
    if (this.querySub) {
      this.querySub.unsubscribe();
      this.querySub = null;
    }
  }

  // Helper method for status colors
  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case "approved":
      case "success":
      case "completed":
        return "var(--color-success)";
      case "pending":
      case "processing":
        return "var(--color-warning)";
      case "rejected":
      case "failed":
      case "declined":
        return "var(--color-danger)";
      default:
        return "var(--color-info)";
    }
  }

  getStatusBorderColor(status: string): string {
    return this.getStatusColor(status); // reuse same color
  }

  getStatusTextColor(status: string): string {
    return "var(--color-font)";
  }
}
