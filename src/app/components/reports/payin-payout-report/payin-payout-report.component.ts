import { Component, OnInit, HostListener, ElementRef } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserStateService } from "../../../pages/services/store/user-state.service";
import { SnackbarService } from "../../../common/snackbar/snackbar.service";

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
}

type DropdownKey =
  | "transactionType"
  | "reviewStatus"
  | "currency"
  | "mode"
  | "pageSize"
  | "download";
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
  holderName: string;
  createdAt: string | Date | null;
  settled: boolean;
  raw: any;
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
  transactionTypeOptions: SelectOption[] = this.toOptions(
    Object.values(TransactionType),
    true,
  );
  reviewStatusOptions: SelectOption[] = this.toOptions(
    Object.values(FundReviewStatus),
    false,
  );
  currencyOptions: SelectOption[] = this.toOptions(
    Object.values(Currency),
    false,
    {
      INR: "currency_rupee",
      USDT: "toll",
      AED: "attach_money",
    },
  );
  modeOptions: SelectOption[] = [];

  // ---------------- date range ----------------
  rangeMode: RangeMode = "custom";
  fromDate: string = "";
  toDate: string = "";
  fromMonth: string = "";
  toMonth: string = "";
  fromYear: number | null = null;
  toYear: number | null = null;
  yearOptions: number[] = this.buildYearOptions();

  // ---------------- table state ----------------
  columns: ColumnDef[] = [
    { key: "displayId", label: "Transaction ID", sortable: true },
    { key: "transactionDate", label: "Date & Time", sortable: true },
    { key: "transactionType", label: "Type", sortable: true },
    { key: "entity", label: "Entity", sortable: false },

    { key: "utr", label: "UTR / Ref No", sortable: false },
    { key: "mode", label: "Mode", sortable: false },
    { key: "currency", label: "Currency", sortable: false },
    { key: "amount", label: "Amount", sortable: true },
    { key: "reviewStatus", label: "Review Status", sortable: true },
    { key: "remarks", label: "Remarks", sortable: false },
  ];

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

  constructor(
    private elementRef: ElementRef,
    private userStateService: UserStateService,
    private transactionHistoryService: TransactionHistoryService,
    private snacBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.entityType = this.userStateService.getRole();
    this.onCurrencyChange();
  }

  // close any open dropdown when clicking outside a [data-dropdown] wrapper
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-dropdown]")) {
      this.openDropdownKey = null;
    }
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

  // Transaction Mode depends on which currencies are selected
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
    this.modeOptions = relevantModes.map((m) => ({
      value: m,
      label: this.toLabel(m),
      checked: previouslyChecked.has(m),
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
      holderName: item.bankAccountHolderName || item.holder || "-",
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

          // NOTE: PAYIN and PAYOUT are two independently paginated collections from the
          // backend. We request `this.pageSize` rows from each per page and show them
          // together, so a single page can render up to (2 × pageSize) rows when both
          // transaction types are selected. Total record count is the sum of both totals.
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

  resetFilters(): void {
    this.transactionTypeOptions.forEach((o) => (o.checked = true));
    this.reviewStatusOptions.forEach((o) => (o.checked = false));
    this.currencyOptions.forEach((o) => (o.checked = false));
    this.onCurrencyChange();
    this.rangeMode = "custom";
    this.fromDate = "";
    this.toDate = "";
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

  // ==================== export (exports only the currently loaded page — see pagination note above) ====================
  exportCsv(): void {
    if (!this.results.length) return;
    const headers = [
      "Transaction ID",
      "Date & Time",
      "Type",
      "Entity",
      "Portal",
      "UTR / Ref No",
      "Mode",
      "Currency",
      "Amount",
      "Review Status",
      "Remarks",
    ];
    const rows = this.results.map((r) => [
      r.displayId,
      r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "-",
      r.transactionType,
      r.entityId,
      r.portal,
      r.transactionId,
      this.toLabel(r.mode),
      r.currency,
      r.amount,
      this.toLabel(r.reviewStatus),
      r.remarks,
    ]);
    const csvContent = [headers, ...rows]
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

  exportPdf(): void {
    if (!this.results.length) return;
    window.print();
  }
}
