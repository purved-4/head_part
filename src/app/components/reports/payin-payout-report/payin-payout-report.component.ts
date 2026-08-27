import { Component, OnInit, HostListener, ElementRef } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserStateService } from "../../../pages/services/store/user-state.service";
import { SnackbarService } from "../../../common/snackbar/snackbar.service";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MultimediaService } from "../../../pages/services/multimedia.service";

// ==================== enums ====================
export enum TransactionMode {
  UPI = "UPI",
  AANI = "AANI",
  BANK = "BANK",
  ERC20 = "ERC20",
  BEP20 = "BEP20",
  TRC20 = "TRC20",
  OMNI = "OMNI",
  SPL = "SPL",
}

export enum TransactionType {
  PAYIN = "PAYIN",
  PAYOUT = "PAYOUT",
}

export enum FundReviewStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  // PROCESSING = "PROCESSING",
  DISPUTE_ESCALATED = "DISPUTE_ESCALATED",
  CP_REJECTED = "CP_REJECTED",
  DISPUTE_PENDING = "DISPUTE_PENDING",
  INVALID = "INVALID",
  PROCESSED = "PROCESSED",
}

export enum Currency {
  INR = "INR",
  USDT = "USDT",
  AED = "AED",
}

// modes grouped by currency, for the dependent "Transaction Mode" dropdown
const MODES_BY_CURRENCY: Record<string, TransactionMode[]> = {
  INR: [TransactionMode.UPI, TransactionMode.BANK],
  AED: [TransactionMode.AANI, TransactionMode.BANK],
  USDT: [
    TransactionMode.ERC20,
    TransactionMode.BEP20,
    TransactionMode.TRC20,
    TransactionMode.OMNI,
    TransactionMode.SPL,
  ],
};

// ==================== shared types ====================
interface SelectOption {
  value: string;
  label: string;
  checked: boolean;
  icon?: string;
}

interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  width: number; // px — user-resizable, kept in component state
  visible?: boolean; // user-toggleable via the "Columns" customizer (default true)
}

type DropdownKey =
  | "transactionType"
  | "reviewStatus"
  | "currency"
  | "mode"
  | "pageSize"
  | "download"
  | "columns";
type RangeMode = "custom" | "month" | "year";
type SortDirection = "asc" | "desc";

interface ReportRow {
  id: string;
  displayId: string;
  transactionId: string; // UTR / bank reference number
  transactionType: "PAYIN" | "PAYOUT";
  entityType: string;
  entityId: string;
  portal: string;
  mode: string;
  currency: string;
  amount: number;
  reviewStatus: string;
  remarks: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  walletAddress: string;
  vpa: string;
  userId: string;
  userName: string;
  holderName: string;
  createdAt: string | Date | null;
  settled: boolean;
  raw: any;
}

interface DetailRow {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  rows: DetailRow[];
}

@Component({
  selector: "app-payin-payout-report",

  templateUrl: "./payin-payout-report.component.html",
  styleUrl: "./payin-payout-report.component.css",
})
export class PayinPayoutReportComponent implements OnInit {
  // ---------------- current entity context (single entity — no hierarchy picker) ----------------
  entityId: any;
  entityType: any;

  // ---------------- filter option groups (all multiselect, incl. currency) ----------------
  // NOTE: all default to "checked = true" so the report opens with every
  // filter pre-selected instead of empty (i.e. "show everything" by default).
  transactionTypeOptions: SelectOption[] = this.toOptions(
    Object.values(TransactionType),
    true,
  );
  reviewStatusOptions: SelectOption[] = this.toOptions(
    Object.values(FundReviewStatus),
    true,
  );
  currencyOptions: SelectOption[] = this.toOptions(
    Object.values(Currency),
    true,
    {
      INR: "currency_rupee",
      USDT: "toll",
      AED: "attach_money",
    },
  );
  modeOptions: SelectOption[] = [];

  // ---------------- date range ----------------
  // Defaults to "last 7 days" (from = today - 7, to = today) instead of blank.
  rangeMode: RangeMode = "custom";
  fromDate: string = "";
  toDate: string = "";
  fromMonth: string = "";
  toMonth: string = "";
  fromYear: number | null = null;
  toYear: number | null = null;
  yearOptions: number[] = this.buildYearOptions();

  // ---------------- table state ----------------
  // Fixed base order: Date & Time -> Transaction ID -> UTR/Ref -> User ID -> Username ->
  // Entity -> Currency -> Mode -> Account/VPA -> Amount -> Review Status -> Remarks -> Actions.
  // Each column carries its own `width` (drag-resize) and `visible` flag (Columns customizer).
  // The user can reorder/hide columns (except Actions, which stays pinned last) via
  // toggleColumnVisibility()/moveColumnUp()/moveColumnDown() — this also drives CSV/PDF export order.
  columns: ColumnDef[] = [
    {
      key: "transactionDate",
      label: "Date & Time",
      sortable: true,
      width: 170,
      visible: true,
    },
    {
      key: "displayId",
      label: "Transaction ID",
      sortable: true,
      width: 170,
      visible: true,
    },
    {
      key: "utr",
      label: "UTR / Ref No",
      sortable: false,
      width: 150,
      visible: true,
    },
    {
      key: "userId",
      label: "User ID",
      sortable: false,
      width: 110,
      visible: true,
    },
    {
      key: "userName",
      label: "Username",
      sortable: false,
      width: 140,
      visible: true,
    },

    {
      key: "currency",
      label: "Currency",
      sortable: false,
      width: 100,
      visible: true,
    },
    { key: "mode", label: "Mode", sortable: false, width: 110, visible: true },
    {
      key: "accountInfo",
      label: "A/C / VPA",
      sortable: false,
      width: 170,
      visible: true,
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      width: 140,
      visible: true,
    },
    {
      key: "reviewStatus",
      label: "Review Status",
      sortable: true,
      width: 150,
      visible: true,
    },
    {
      key: "remarks",
      label: "Remarks",
      sortable: false,
      width: 200,
      visible: true,
    },
    { key: "actions", label: "", sortable: false, width: 56, visible: true },
  ];

  readonly SR_NO_WIDTH = 64;
  private readonly MIN_COL_WIDTH = 70;

  results: ReportRow[] = [];
  searchTerm: string = "";
  sortColumn: string = "transactionDate";
  sortDirection: SortDirection = "desc";

  // ---------------- pagination (server-driven) ----------------
  pageSizeOptions: number[] = [10, 20, 50, 100];
  pageSize: number = 20;
  currentPage: number = 1; // 1-based, for display
  totalRecords: number = 0;

  // ---------------- ui state ----------------
  loading: boolean = false;
  searched: boolean = false;
  errorMessage: string = "";
  openDropdownKey: DropdownKey | null = null;

  // ---------------- column resize state ----------------
  resizingColKey: string | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private dragMoved = false;

  // ---------------- details modal state ----------------
  showModal: boolean = false;
  selectedRow: ReportRow | null = null;
  modalImageUrl: string | null = null;
  modalImageLoading: boolean = false;
  modalImageError: boolean = false;

  constructor(
    private elementRef: ElementRef,
    private userStateService: UserStateService,
    private transactionHistoryService: TransactionHistoryService,
    private multiMedia: MultimediaService,
    private snacBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.entityType = this.userStateService.getRole();
    this.onCurrencyChange();
    this.applyDefaultDateRange();
  }

  // close any open dropdown when clicking outside a [data-dropdown] wrapper
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-dropdown]")) {
      this.openDropdownKey = null;
    }
  }

  // ==================== column resize (drag the handle on a header's right edge) ====================
  startResize(event: MouseEvent, col: ColumnDef): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizingColKey = col.key;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = col.width;
    this.dragMoved = false;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  @HostListener("document:mousemove", ["$event"])
  onResizeMove(event: MouseEvent): void {
    if (!this.resizingColKey) return;
    const col = this.columns.find((c) => c.key === this.resizingColKey);
    if (!col) return;
    const delta = event.clientX - this.resizeStartX;
    if (Math.abs(delta) > 3) this.dragMoved = true;
    col.width = Math.max(this.MIN_COL_WIDTH, this.resizeStartWidth + delta);
  }

  @HostListener("document:mouseup")
  onResizeEnd(): void {
    if (!this.resizingColKey) return;
    this.resizingColKey = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }

  // Header click sorts — but not right after a drag-resize on that same header.
  onHeaderClick(col: ColumnDef): void {
    if (this.dragMoved) {
      this.dragMoved = false;
      return;
    }
    if (col.sortable) this.sortBy(col.key);
  }

  // ==================== column customizer (show/hide + reorder, "Actions" stays pinned last) ====================
  get visibleColumns(): ColumnDef[] {
    return this.columns.filter((c) => c.visible !== false);
  }

  // Columns shown in the customizer dropdown — "Actions" is excluded, it's not user-toggleable.
  get customizableColumns(): ColumnDef[] {
    return this.columns.filter((c) => c.key !== "actions");
  }

  toggleColumnVisibility(col: ColumnDef): void {
    if (col.key === "actions") return;
    col.visible = col.visible === false ? true : false;
  }

  moveColumnUp(col: ColumnDef): void {
    const idx = this.columns.indexOf(col);
    if (idx <= 0) return;
    [this.columns[idx - 1], this.columns[idx]] = [
      this.columns[idx],
      this.columns[idx - 1],
    ];
  }

  moveColumnDown(col: ColumnDef): void {
    const idx = this.columns.indexOf(col);
    if (idx === -1 || idx >= this.columns.length - 1) return;
    // keep "Actions" pinned as the last column
    if (this.columns[idx + 1].key === "actions") return;
    [this.columns[idx + 1], this.columns[idx]] = [
      this.columns[idx],
      this.columns[idx + 1],
    ];
  }

  // ==================== small helpers ====================
  private toLabel(value: string): string {
    if (!value) return "-";
    return value
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  private toOptions(
    values: string[],
    defaultChecked: boolean,
    icons?: Record<string, string>,
  ): SelectOption[] {
    return values.map((v) => ({
      value: v,
      label: v.length <= 4 ? v : this.toLabel(v),
      checked: defaultChecked,
      icon: icons?.[v],
    }));
  }

  private buildYearOptions(): number[] {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current; y >= current - 5; y--) years.push(y);
    return years;
  }

  // Sets the default custom date range to "last 7 days" (today - 7 -> today).
  private applyDefaultDateRange(): void {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    this.fromDate = weekAgo.toISOString().split("T")[0];
    this.toDate = today.toISOString().split("T")[0];
  }

  displayValue(value: any): string {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "number") {
      return value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  }

  private formatDateTime(value: any): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  }

  getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  // ==================== dropdown handling ====================
  toggleDropdown(key: DropdownKey): void {
    this.openDropdownKey = this.openDropdownKey === key ? null : key;
  }

  isDropdownOpen(key: DropdownKey): boolean {
    return this.openDropdownKey === key;
  }

  toggleOption(list: SelectOption[], value: string): void {
    const opt = list.find((o) => o.value === value);
    if (opt) opt.checked = !opt.checked;
    if (list === this.currencyOptions) this.onCurrencyChange();
  }

  toggleSelectAll(list: SelectOption[], checked: boolean): void {
    list.forEach((o) => (o.checked = checked));
    if (list === this.currencyOptions) this.onCurrencyChange();
  }

  getSelectedValues(list: SelectOption[]): string[] {
    return list.filter((o) => o.checked).map((o) => o.value);
  }

  getGroupLabel(list: SelectOption[], placeholder: string): string {
    const selected = list.filter((o) => o.checked);
    if (!selected.length) return placeholder;
    if (selected.length === 1) return selected[0].label;
    if (selected.length === list.length) return "All selected";
    return `${selected.length} selected`;
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.getSelectedValues(this.transactionTypeOptions).length) count++;
    if (this.getSelectedValues(this.reviewStatusOptions).length) count++;
    if (this.getSelectedValues(this.currencyOptions).length) count++;
    if (this.getSelectedValues(this.modeOptions).length) count++;
    if (this.rangeMode === "custom" && (this.fromDate || this.toDate)) count++;
    if (this.rangeMode === "month" && (this.fromMonth || this.toMonth)) count++;
    if (this.rangeMode === "year" && (this.fromYear || this.toYear)) count++;
    return count;
  }

  // Transaction Mode depends on which currencies are selected.
  // First time round (modeOptions still empty) every relevant mode defaults to checked,
  // so the dependent dropdown also opens fully pre-selected; afterwards user choices persist.
  private onCurrencyChange(): void {
    const selectedCurrencies = this.getSelectedValues(this.currencyOptions);
    const relevantModes = selectedCurrencies.length
      ? Array.from(
          new Set(
            selectedCurrencies.flatMap((c) => MODES_BY_CURRENCY[c] ?? []),
          ),
        )
      : Object.values(TransactionMode);

    const previouslyChecked = new Set(this.getSelectedValues(this.modeOptions));
    const isFirstBuild = this.modeOptions.length === 0;
    this.modeOptions = relevantModes.map((m) => ({
      value: m,
      label: this.toLabel(m),
      checked: isFirstBuild ? true : previouslyChecked.has(m),
    }));
  }

  // ==================== date range ====================
  setRangeMode(mode: RangeMode): void {
    this.rangeMode = mode;
  }

  onCustomDateChange(): void {}
  onMonthRangeChange(): void {}
  onYearRangeChange(): void {}

  private resolveDateRange(): { from: string; to: string } {
    if (this.rangeMode === "custom") {
      return {
        from: this.fromDate ? new Date(this.fromDate).toISOString() : "",
        to: this.toDate
          ? new Date(this.toDate + "T23:59:59").toISOString()
          : "",
      };
    }
    if (this.rangeMode === "month") {
      const from = this.fromMonth ? new Date(`${this.fromMonth}-01`) : null;
      const to = this.toMonth ? new Date(`${this.toMonth}-01`) : null;
      if (to) to.setMonth(to.getMonth() + 1, 0);
      return {
        from: from ? from.toISOString() : "",
        to: to ? to.toISOString() : "",
      };
    }
    // year mode
    const from = this.fromYear ? new Date(this.fromYear, 0, 1) : null;
    const to = this.toYear ? new Date(this.toYear, 11, 31, 23, 59, 59) : null;
    return {
      from: from ? from.toISOString() : "",
      to: to ? to.toISOString() : "",
    };
  }

  canSearch(): boolean {
    if (this.rangeMode === "custom") return !!(this.fromDate && this.toDate);
    if (this.rangeMode === "month") return !!(this.fromMonth && this.toMonth);
    return !!(this.fromYear && this.toYear);
  }

  // ==================== row mapping (handles the PAYIN / PAYOUT keyed response) ====================
  private mapRow(item: any, txType: "PAYIN" | "PAYOUT"): ReportRow {
    return {
      id:
        item.id ??
        item.displayId ??
        `${txType}-${Math.random().toString(36).slice(2)}`,
      displayId: item.displayId || item.id || "-",
      transactionId: item.transactionId || item.utr || "-",
      transactionType: txType,
      entityType: item.entityType || this.entityType || "-",
      entityId: item.entityId || "-",
      portal: item.portalDomain || item.portalName || item.portalId || "-",
      mode: item.payinType || item.mode || item.fundtype || "-",
      currency: item.currency || item.parentCurrency || "-",
      amount: Number(item.amount) || 0,
      reviewStatus: item.reviewStatus || item.status || "PENDING",
      // dispute reason (queryText) takes priority when the review is escalated; else fall back to plain remarks
      remarks: item.queryText || item.remarks || item.message || "-",
      bankName: item.bankName || item.bank || "-",
      accountNo: item.accountNo || item.accountNumber || "-",
      ifsc: item.ifsc || "-",
      walletAddress: item.walletAddress || "-",
      vpa: item.vpa || "-",
      userId: item.userId || "-",
      userName: item.userName || item.username || "-",
      holderName: item.holder || item.bankAccountHolderName || "-",
      createdAt: item.createdAt || item.dateTime || null,
      settled: !!item.settled,
      raw: item,
    };
  }

  // ==================== search / reset ====================
  // page is 0-based (matches backend pageable), defaults to first page
  loadReport(page: number = 0): void {
    this.errorMessage = "";
    this.loading = true;
    this.searched = true;
    this.openDropdownKey = null;

    const { from, to } = this.resolveDateRange();

    this.transactionHistoryService
      .getFundsForAllLevels({
        entityId: this.entityId,
        entityType: this.entityType,
        reviewStatus: this.getSelectedValues(this.reviewStatusOptions),
        fundType: this.getSelectedValues(this.transactionTypeOptions),
        fundMode: this.getSelectedValues(this.modeOptions),
        currency: this.getSelectedValues(this.currencyOptions),
        fromDate: from,
        toDate: to,
        page: page,
        size: this.pageSize,
      })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          const data = res?.data ?? res ?? {};

          const payin = data?.PAYIN ?? {};
          const payout = data?.PAYOUT ?? {};

          const payinContent = payin.content ?? [];
          const payoutContent = payout.content ?? [];

          this.results = [
            ...payinContent.map((item: any) => this.mapRow(item, "PAYIN")),
            ...payoutContent.map((item: any) => this.mapRow(item, "PAYOUT")),
          ];

          this.totalRecords =
            (payin.totalElements ?? 0) + (payout.totalElements ?? 0);
          this.currentPage = page + 1;

          this.applySearchAndSort();
        },
        error: (err) => {
          this.loading = false;
          this.results = [];
          this.totalRecords = 0;
          this.snacBar.show(
            err?.error?.message || "Failed to load transactions",
            false,
          );
        },
      });
  }

  // Resets filters back to the default "everything pre-selected, last 7 days" state
  // (same defaults as ngOnInit) rather than clearing them out.
  resetFilters(): void {
    this.transactionTypeOptions.forEach((o) => (o.checked = true));
    this.reviewStatusOptions.forEach((o) => (o.checked = true));
    this.currencyOptions.forEach((o) => (o.checked = true));
    this.modeOptions = [];
    this.onCurrencyChange();
    this.rangeMode = "custom";
    this.applyDefaultDateRange();
    this.fromMonth = "";
    this.toMonth = "";
    this.fromYear = null;
    this.toYear = null;
    this.searchTerm = "";
    this.pageSize = 20;
    this.results = [];
    this.totalRecords = 0;
    this.currentPage = 1;
    this.searched = false;
    this.errorMessage = "";
    this.openDropdownKey = null;
  }

  // ==================== search / sort (applied to the currently loaded page only) ====================
  onSearchChange(): void {
    this.applySearchAndSort();
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }
    this.applySearchAndSort();
  }

  private applySearchAndSort(): void {
    let rows = [...this.results];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      rows = rows.filter((r) =>
        [
          r.displayId,
          r.transactionId,
          r.portal,
          r.currency,
          r.reviewStatus,
          r.mode,
          r.entityId,
          r.remarks,
          r.userId,
          r.userName,
          r.accountNo,
          r.walletAddress,
          r.vpa,
        ]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(term)),
      );
    }

    rows.sort((a: any, b: any) => {
      const key =
        this.sortColumn === "transactionDate" ? "createdAt" : this.sortColumn;
      let av = a[key];
      let bv = b[key];
      if (this.sortColumn === "transactionDate") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }
      if (av < bv) return this.sortDirection === "asc" ? -1 : 1;
      if (av > bv) return this.sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    this.results = rows;
  }

  // ==================== pagination (server-driven — every page change re-fetches) ====================
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get pageStart(): number {
    return this.results.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(
      this.pageStart + this.results.length - 1,
      this.totalRecords,
    );
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.loadReport(page - 1);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.openDropdownKey = null;
    if (this.searched) this.loadReport(0);
  }

  trackByColKey(_index: number, col: ColumnDef): string {
    return col.key;
  }

  // ==================== presentation helpers ====================
  transactionTypeClass(type: string): string {
    return type === "PAYIN"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
      : "bg-rose-50 text-rose-600 border border-rose-100";
  }

  statusClass(status: string): string {
    switch (status) {
      case "ACCEPTED":
      case "PROCESSED":
        return "bg-emerald-50 text-emerald-700";
      case "PROCESSING":
        return "bg-emerald-50 text-emerald-700";
      case "PENDING":
      case "DISPUTE_PENDING":
        return "bg-amber-50 text-amber-700";
      case "CP_REJECTED":
      case "INVALID":
      case "DISPUTE_ESCALATED":
        return "bg-rose-50 text-rose-600";
      default:
        return "bg-gray-50 text-gray-500";
    }
  }

  // Priority: bank account -> wallet address -> VPA. Falls back to '-' when none present.
  getAccountDisplay(row: ReportRow): {
    icon: string;
    label: string;
    value: string;
  } {
    const raw = row.raw || {};
    if (raw.accountNo) {
      return { icon: "account_balance", label: "A/C", value: raw.accountNo };
    }
    if (raw.walletAddress) {
      return {
        icon: "account_balance_wallet",
        label: "Wallet",
        value: raw.walletAddress,
      };
    }
    if (raw.vpa) {
      return { icon: "alternate_email", label: "VPA", value: raw.vpa };
    }
    return { icon: "help_outline", label: "-", value: "-" };
  }

  // ==================== details modal ====================
  openDetails(row: ReportRow): void {
    this.selectedRow = row;
    this.showModal = true;
    this.modalImageUrl = null;
    this.modalImageError = false;
    this.modalImageLoading = false;

    const filePath = row.raw?.filePath;
    if (filePath) {
      this.modalImageLoading = true;
      this.multiMedia.getPrivateImage(filePath).subscribe({
        next: (url: string) => {
          this.modalImageUrl = url;
          this.modalImageLoading = false;
        },
        error: () => {
          this.modalImageLoading = false;
          this.modalImageError = true;
        },
      });
    }
  }

  closeModal(): void {
    if (this.modalImageUrl) {
      URL.revokeObjectURL(this.modalImageUrl);
    }
    this.showModal = false;
    this.selectedRow = null;
    this.modalImageUrl = null;
    this.modalImageError = false;
    this.modalImageLoading = false;
  }

  // Downloads the currently displayed attachment image (blob URL from modalImageUrl)
  // as a file, named after the transaction's displayId.
  downloadAttachment(): void {
    if (!this.modalImageUrl) return;
    const ext = this.guessExtensionFromPath(this.selectedRow?.raw?.filePath);
    const link = document.createElement("a");
    link.href = this.modalImageUrl;
    link.download = `attachment-${this.selectedRow?.displayId || "file"}${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private guessExtensionFromPath(filePath?: string): string {
    if (!filePath) return "";
    const match = filePath.match(/\.[a-zA-Z0-9]+($|\?)/);
    return match ? match[0].replace("?", "") : "";
  }

  // Builds the grouped label/value sections shown in the details modal.
  // Works off `row.raw` (the untouched API item) so PAYIN and PAYOUT both
  // surface whichever fields they actually have; anything missing shows "-".
  getDetailSections(row: ReportRow | null): DetailSection[] {
    if (!row) return [];
    const raw = row.raw || {};
    const isPayin = row.transactionType === "PAYIN";

    const sections: DetailSection[] = [];

    sections.push({
      title: "Transaction",
      rows: [
        { label: "Transaction ID", value: this.displayValue(row.displayId) },
        { label: "UTR / Ref No", value: this.displayValue(row.transactionId) },
        { label: "Type", value: row.transactionType },
        { label: "Mode", value: this.toLabel(row.mode) },
        { label: "Currency", value: this.displayValue(row.currency) },
        { label: "Amount", value: this.displayValue(row.amount) },
        { label: "Review Status", value: this.toLabel(row.reviewStatus) },
        {
          label: isPayin ? "Dispute Reason" : "Remarks",
          value: this.displayValue(row.remarks),
        },
        { label: "Created At", value: this.formatDateTime(row.createdAt) },
        { label: "Updated At", value: this.formatDateTime(raw.updatedAt) },
      ],
    });

    sections.push({
      title: "Payment Destination",
      rows: [
        { label: "User ID", value: this.displayValue(raw.userId) },
        { label: "Username", value: this.displayValue(raw.userName) },
        { label: "Account No", value: this.displayValue(raw.accountNo) },
        { label: "IFSC", value: this.displayValue(raw.ifsc) },
        {
          label: "Wallet Address",
          value: this.displayValue(raw.walletAddress),
        },
        { label: "VPA", value: this.displayValue(raw.vpa) },
        {
          label: "Account Holder",
          value: this.displayValue(raw.holder || raw.bankAccountHolderName),
        },
      ],
    });

    const rateRows: DetailRow[] = [
      {
        label: "CC Wise Amount",
        value: this.displayValue(raw.currencyCcWiseAmount),
      },
      {
        label: "CP Wise Amount",
        value: this.displayValue(raw.currencyCpWiseAmount),
      },
      { label: "Rate", value: this.displayValue(raw.rate) },
      { label: "CC Rate", value: this.displayValue(raw.ccRate) },
      { label: "CP Rate", value: this.displayValue(raw.cpRate) },
    ];
    if (isPayin) {
      rateRows.push({
        label: "Payin Type",
        value: this.displayValue(raw.payinType),
      });
    }
    sections.push({ title: "Rates & Amounts", rows: rateRows });

    return sections;
  }

  // ==================== export (exports only the currently loaded page, in the same ====================
  // ==================== column order/visibility the user has set via the Columns customizer) ====================
  private getCellExportValue(row: ReportRow, key: string): string | number {
    switch (key) {
      case "transactionDate":
        return row.createdAt
          ? new Date(row.createdAt).toLocaleString("en-IN")
          : "-";
      case "displayId":
        return row.displayId;
      case "utr":
        return row.transactionId;
      case "userId":
        return row.userId;
      case "userName":
        return row.userName;
      case "entity":
        return row.entityId;
      case "currency":
        return row.currency;
      case "mode":
        return this.toLabel(row.mode);
      case "accountInfo":
        return this.getAccountDisplay(row).value;
      case "amount":
        return row.amount;
      case "reviewStatus":
        return this.toLabel(row.reviewStatus);
      case "remarks":
        return row.remarks;
      default:
        return "-";
    }
  }

  private exportColumns(): ColumnDef[] {
    return this.columns.filter(
      (c) => c.visible !== false && c.key !== "actions",
    );
  }

  private exportHeaders(): string[] {
    return this.exportColumns().map((c) => c.label);
  }

  private exportRows(): (string | number)[][] {
    const cols = this.exportColumns();
    return this.results.map((r) =>
      cols.map((c) => this.getCellExportValue(r, c.key)),
    );
  }

  exportCsv(): void {
    if (!this.results.length) return;
    const csvContent = [this.exportHeaders(), ...this.exportRows()]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payin-payout-report-page-${this.currentPage}-${this.getTodayDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Generates an actual downloadable PDF (not a print dialog) with the
  // currently loaded page's data, using jspdf + jspdf-autotable.
  // npm install jspdf jspdf-autotable
  exportPdf(): void {
    if (!this.results.length) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    doc.setFontSize(14);
    doc.text("Payin / Payout Report", 40, 30);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Generated on ${new Date().toLocaleString("en-IN")}  ·  Showing ${this.pageStart}-${this.pageEnd} of ${this.totalRecords}`,
      40,
      45,
    );
    doc.setTextColor(0);

    autoTable(doc, {
      head: [this.exportHeaders()],
      body: this.exportRows(),
      startY: 58,
      styles: { fontSize: 7.5, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [4, 120, 87], textColor: 255 }, // emerald-700
      alternateRowStyles: { fillColor: [247, 248, 250] },
      margin: { left: 30, right: 30 },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 80,
          doc.internal.pageSize.getHeight() - 15,
        );
      },
    });

    doc.save(
      `payin-payout-report-page-${this.currentPage}-${this.getTodayDate()}.pdf`,
    );
  }
}
