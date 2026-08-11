import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { Subscription } from "rxjs";
import { UserStateService } from "../../../store/user-state.service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { UtilsServiceService } from "../../../utils/utils-service.service";
import { ComPartService } from "../../../pages/services/com-part.service";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserService } from "../../../pages/services/user.service";

export interface MultiOption {
  label: string;
  value: string;
  checked: boolean;
  icon?: string;
}

export interface PortalDTO {
  portalId: string;
  portalName: string;
}

export interface NetworkOption {
  code: string;
  icon: string;
  label: string;
}

export interface CurrencyConfig {
  currency: string;
  display: string;
  icon: string;
  networks: NetworkOption[];
}

export interface EntityBalanceReportDTO {
  id: string;
  transactionDate?: string;
  entityId: string;
  entityType?: string;
  parentId?: string;
  transactionType: string;
  transactionLabel: string;
  openingBalance: number;
  closingBalance: number;
  transactionAmount: number;
  credit: number;
  debit: number;

  [key: string]: any;
}

export interface EntityBalanceDTO {
  updatedAt?: string;
  createdAt?: string;
  id: string;
  entityType?: string;
  entityId?: string;
  fundId?: string;
  fundType?: string;
  transactionType?: any;
  parentId?: string | null;
  parentType?: string | null;
  referenceId?: string | null;
  currency?: string;
  isPPI?: boolean;
  previousAmount?: number | null;
  beforeBalance?: number;
  transactionAmount?: any;
  afterBalance?: number;
  totalAvailable?: number;
  rewardAmount?: number;
  payinId?:any
  [key: string]: any;
}

export interface InventoryOption {
  id: string;
  name: string;
}

type RangeMode = "custom" | "month" | "year";
type SortDirection = "asc" | "desc";

@Component({
  selector: "app-portal-report",
  templateUrl: "./portal-report.component.html",
})
export class PortalReportComponent implements OnInit, OnDestroy {
  transactionTypeOptions: MultiOption[] = [
    { label: "Pay In", value: "PAYIN", checked: true },
    { label: "Pay Out", value: "PAYOUT", checked: true },
    { label: "Credit Reference", value: "CREDIT_REF", checked: true },
    { label: "Reward", value: "REWARD", checked: true },
    { label: "PPI", value: "PPI", checked: true },
    { label: "RPI", value: "RPI", checked: true },
  ];

  private static readonly ALL_AMOUNT_TYPE_OPTIONS: MultiOption[] = [
    { label: "Credit", value: "REF_CREDIT", checked: true },
    { label: "Debit", value: "REF_DEBIT", checked: true },
  ];

  amountTypeOptions: MultiOption[] = [
    { label: "Credit", value: "REF_CREDIT", checked: true },
    { label: "Debit", value: "REF_DEBIT", checked: true },
  ];

  transactionStatusOptions: MultiOption[] = [
    { label: "Settled", value: "SETTLED", checked: true },
    { label: "Disputed", value: "DISPUTED", checked: true },
    { label: "Thread", value: "THREAD", checked: true },
    { label: "Exposure", value: "EXPOSURE", checked: true },
  ];

  portalOptions: MultiOption[] = [];
  currencyOptions: MultiOption[] = [];
  paymentMethodOptions: MultiOption[] = [];
  loadingPortals = false;

  private static readonly CURRENCY_CONFIG: CurrencyConfig[] = [
    {
      currency: "INR",
      display: "Indian Rupee",
      icon: "currency_rupee",
      networks: [
        { code: "BANK", icon: "account_balance", label: "BANK" },
        { code: "UPI", icon: "qr_code_scanner", label: "UPI" },
      ],
    },
    {
      currency: "USDT",
      display: "Tether",
      icon: "toll",
      networks: [
        { code: "ERC20", icon: "hub", label: "ERC20" },
        { code: "BEP20", icon: "lan", label: "BEP20" },
        { code: "TRC20", icon: "settings_ethernet", label: "TRC20" },
        { code: "OMNI", icon: "currency_bitcoin", label: "OMNI" },
        { code: "SPL", icon: "token", label: "SPL" },
      ],
    },
  ];

  activeDropdown: string | null = null;

  fromDate: string = "";
  toDate: string = "";

  rangeMode: RangeMode = "custom";

  activeQuickRange: "week" | null = null;

  fromMonth: string = "";
  toMonth: string = "";

  fromYear: number = new Date().getFullYear();
  toYear: number = new Date().getFullYear();
  readonly yearOptions: number[] = this.buildYearOptions();

  loading = false;
  errorMessage: string | null = null;

  rawReportMap: Record<string, EntityBalanceReportDTO[]> = {};
  allResults: EntityBalanceReportDTO[] = [];
  filteredResults: EntityBalanceReportDTO[] = [];
  results: EntityBalanceReportDTO[] = [];
  pagedResults: EntityBalanceReportDTO[] = [];

  searchTerm = "";
  sortColumn: string | null = null;
  sortDirection: SortDirection = "asc";
  currentPage = 1;
  pageSize = 10;

  columns: { key: string; label: string; sortable: boolean }[] = [
    { key: "transactionDate", label: "Transaction Date", sortable: true },
    { key: "transactionLabel", label: "Transaction Type", sortable: true },
    { key: "openingBalance", label: "Opening", sortable: true },
    { key: "credit", label: "Credit", sortable: true },
    { key: "debit", label: "Debit", sortable: true },
    { key: "closingBalance", label: "Closing", sortable: true },
  ];
  currentUserId: any;
  currentUserRole: any;
  private subs: Subscription[] = [];

  comPartOptions: MultiOption[] = [];
  loadingComParts = false;
  currentRoleId: any;
  entityTypes:any

  entities: { id: string; name: string }[] = [];
loadingEntities = false;
selectedEntityType: string | null = null;
selectedEntityId: string | null = null;


selectedInventoryId: string | null = null;


inventoryOptions: MultiOption[] = [];
loadingInventory = false;


inventoryReportData: EntityBalanceDTO[] = [];
showInventoryModal = false;

  constructor(
    private comPartService: ComPartService,
    private userStateService: UserStateService,
    private transactionService: TransactionHistoryService,
    private utilService:UtilsServiceService,
    private userService:UserService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getCurrentEntityId();
    this.currentUserRole = this.userStateService.getRole();
    this.currentRoleId = this.userStateService.getUserId()
    this.setDefaultDateRange();

    this.refreshAmountTypeOptions();

    if (this.currentUserRole === "COM_PART") {
      this.loadPortalOptions();
    } else if (this.currentUserRole === "OWNER") {
    }

    this.loadCurrencyOptions();

    if (this.currentUserRole !== "COM_PART") {
      this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(
  this.currentUserRole,
  
);


    } 
this.selectedEntityType = this.currentUserRole?.toString().toLowerCase();
   this.selectedEntityId = this.currentUserId;

  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-dropdown]")) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(key: string): void {
    this.activeDropdown = this.activeDropdown === key ? null : key;
  }

  isDropdownOpen(key: string): boolean {
    return this.activeDropdown === key;
  }

  toggleOption(options: MultiOption[], value: string): void {
    const opt = options.find((o) => o.value === value);
    if (opt) opt.checked = !opt.checked;
    this.handleCascade(options);
  }

  toggleSelectAll(options: MultiOption[], checked: boolean): void {
    options.forEach((o) => (o.checked = checked));
    this.handleCascade(options);
  }

private handleCascade(options: MultiOption[]): void {
  if (options === this.currencyOptions) {
    this.refreshPaymentMethodOptions();
    this.loadInventoryOptions();
  }

  if (options === this.paymentMethodOptions) {
    this.loadInventoryOptions();
  }

  if (options === this.transactionTypeOptions) {
    this.refreshAmountTypeOptions();

    if (this.isAmountTypeDisabled && this.activeDropdown === "amountType") {
      this.activeDropdown = null;
    }
  }
}

get isHeadOrBranchSelected(): boolean {
  const role = (
    this.selectedEntityType ||
    this.currentUserRole ||
    ""
  ).toString().toUpperCase();

  return role === "HEAD" || role === "BRANCH";
}

loadInventoryOptions(): void {
  this.inventoryOptions = [];

  if (!this.isHeadOrBranchSelected || !this.selectedEntityId) {
    return;
  }

  const currencies = this.getSelectedValues(this.currencyOptions);
  const paymentMethods = this.getSelectedValues(this.paymentMethodOptions);

  if (!currencies.length || !paymentMethods.length) {
    return;
  }

  this.loadingInventory = true;

  const sub = this.transactionService
    .getInventory(this.selectedEntityId, paymentMethods)
    .subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : [];

        // Multi-select ke liye: initially KOI BHI checked nahi hoga
        this.inventoryOptions = list.map((item: any) => ({
          label: item.name,
          value: String(item.id),
          checked: false,
        }));

        this.loadingInventory = false;
      },
      error: () => {
        this.inventoryOptions = [];
        this.loadingInventory = false;
      },
    });

  this.subs.push(sub);
}

  getSelectedValues(options: MultiOption[]): string[] {
    return options.filter((o) => o.checked).map((o) => o.value);
  }

  getGroupLabel(options: MultiOption[], placeholder = "Select"): string {
    if (!options.length) return placeholder;

    const checked = options.filter((o) => o.checked);
    if (checked.length === 0) return "None selected";
    if (checked.length === options.length) return "All";
    if (checked.length <= 2) return checked.map((o) => o.label).join(", ");
    return `${checked.length} selected`;
  }

  get activeFilterCount(): number {
    const groups = [
      this.transactionTypeOptions,
      this.amountTypeOptions,
      this.transactionStatusOptions,
      this.currencyOptions,
      this.portalOptions,
      this.comPartOptions,
      this.paymentMethodOptions,
    ];
    let count = groups.filter(
      (g) => g.length > 0 && g.some((o) => !o.checked),
    ).length;
    if (this.searchTerm.trim()) count++;
    if (this.activeQuickRange || this.rangeMode !== "custom") count++;
    return count;
  }

  private buildYearOptions(): number[] {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current; y >= current - 6; y--) years.push(y);
    return years;
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);

    this.toDate = this.toDateInputValue(today);
    this.fromDate = this.toDateInputValue(monthAgo);
  }

  private toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  private toMonthInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  private toIsoStart(dateStr: string): string {
    return `${dateStr}T00:00:00.000Z`;
  }

  private toIsoEnd(dateStr: string): string {
    return `${dateStr}T23:59:59.999Z`;
  }

  setRangeMode(mode: RangeMode): void {
    this.rangeMode = mode;
    this.activeDropdown = null;

    if (mode === "month") {
      const current = this.toMonthInputValue(new Date());
      if (!this.fromMonth) this.fromMonth = current;
      if (!this.toMonth) this.toMonth = current;
      this.onMonthRangeChange();
    } else if (mode === "year") {
      const current = new Date().getFullYear();
      if (!this.fromYear) this.fromYear = current;
      if (!this.toYear) this.toYear = current;
      this.onYearRangeChange();
    } else {
      this.activeQuickRange = null;
      this.applyFilters();
    }
  }

  onCustomDateChange(): void {
    this.rangeMode = "custom";
    this.activeQuickRange = null;
    this.applyFilters();
  }

  applyQuickRange(range: "week"): void {
    this.rangeMode = "custom";
    this.activeQuickRange = range;
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 7);

    this.fromDate = this.toDateInputValue(from);
    this.toDate = this.toDateInputValue(today);
    this.applyFilters();
  }

  onMonthRangeChange(): void {
    if (!this.fromMonth || !this.toMonth) return;

    if (this.toMonth < this.fromMonth) {
      [this.fromMonth, this.toMonth] = [this.toMonth, this.fromMonth];
    }

    const [fy, fm] = this.fromMonth.split("-").map(Number);
    const [ty, tm] = this.toMonth.split("-").map(Number);
    const today = new Date();

    const fromD = new Date(fy, fm - 1, 1);

    const isCurrentOrFutureMonth =
      ty > today.getFullYear() ||
      (ty === today.getFullYear() && tm >= today.getMonth() + 1);

    let toD = isCurrentOrFutureMonth ? today : new Date(ty, tm, 0);
    if (toD > today) toD = today;

    this.fromDate = this.toDateInputValue(fromD);
    this.toDate = this.toDateInputValue(toD);
    this.applyFilters();
  }

  onYearRangeChange(): void {
    if (!this.fromYear || !this.toYear) return;

    if (this.toYear < this.fromYear) {
      [this.fromYear, this.toYear] = [this.toYear, this.fromYear];
    }

    const today = new Date();
    const fromD = new Date(this.fromYear, 0, 1);

    const isCurrentOrFutureYear = this.toYear >= today.getFullYear();
    let toD = isCurrentOrFutureYear ? today : new Date(this.toYear, 11, 31);
    if (toD > today) toD = today;

    this.fromDate = this.toDateInputValue(fromD);
    this.toDate = this.toDateInputValue(toD);
    this.applyFilters();
  }

 loadReport(): void {
  if (!this.selectedEntityId) return;

  this.loading = true;
  this.errorMessage = null;

  const targetEntityId = this.selectedEntityId;

  // COM_PART user hamesha khud ko dekhta hai (dropdown hidden hi rehta hai unke liye)
  const targetEntityRole = this.currentUserRole === "COM_PART"
    ? "COM_PART"
    : (this.selectedEntityType || this.currentUserRole)?.toString().toUpperCase();

const filters: any = {
  transactionTypes: this.getSelectedValues(this.transactionTypeOptions),
  amountTypes: this.getSelectedValues(this.amountTypeOptions),
  currencies: this.getSelectedValues(this.currencyOptions),
  paymentMethods: this.getSelectedValues(this.paymentMethodOptions),
  fromDate: this.fromDate ? this.toIsoStart(this.fromDate) : undefined,
  toDate: this.toDate ? this.toIsoEnd(this.toDate) : undefined,
};

  let request$;

if (targetEntityRole === "COM_PART") {
  filters.portalIds = this.getSelectedValues(this.portalOptions);

  // COM_PART me inventories nahi jayega
  request$ = this.transactionService.reportComPartFund(
    targetEntityId,
    filters
  );

} else if (
  targetEntityRole === "HEAD" ||
  targetEntityRole === "BRANCH"
) {
  // Ab multi-select se directly array milega
  filters.inventories = this.getSelectedValues(this.inventoryOptions);

  request$ = this.transactionService.reportHeadBranchFund(
    targetEntityId,
    filters
  );

} else {
  filters.inventories = this.getSelectedValues(this.inventoryOptions);

  if (this.currentUserRole === "OWNER") {
    filters.comPartIds = this.getSelectedValues(this.comPartOptions);
  }

  request$ = this.transactionService.reportOtherFund(
    targetEntityId,
    filters
  );
}

  const sub = request$.subscribe({
  next: (map: Record<string, any[]>) => {
    const responseMap: Record<string, any[]> = { ...(map || {}) };

    // "inventory" key ka data alag DTO shape mein hai, isko separate rakhein
    this.inventoryReportData = Array.isArray(responseMap["inventory"])
      ? responseMap["inventory"]
      : [];

    delete responseMap["inventory"];

    this.rawReportMap = responseMap as Record<string, EntityBalanceReportDTO[]>;
    this.allResults = Object.entries(this.rawReportMap).flatMap(
      ([key, rows]) => rows.map((row) => ({ ...row, sourceKey: key })),
    );
    this.applyFilters();
    this.loading = false;
  },
  error: () => {
    this.rawReportMap = {};
    this.allResults = [];
    this.inventoryReportData = [];
    this.applyFilters();
    this.errorMessage =
      "Something went wrong while fetching the report. Please try again.";
    this.loading = false;
  },
});

  this.subs.push(sub);
}

  loadPortalOptions(): void {
    if (!this.currentUserId) return;

    this.loadingPortals = true;

    const sub = this.comPartService
      .getPortalByComPartId(this.currentUserId)
      .subscribe({
        next: (res: any) => {
          const list: any[] = res ?? [];

          this.portalOptions = list.map((p: any) => ({
            label: p.domain ?? p.name ?? p.portalId ?? p.id,
            value: p.id,
            checked: true,
          }));

          this.loadingPortals = false;
        },
        error: () => {
          this.portalOptions = [];
          this.loadingPortals = false;
        },
      });

    this.subs.push(sub);
  }

  loadCurrencyOptions(): void {
    this.currencyOptions = PortalReportComponent.CURRENCY_CONFIG.map((c) => ({
      label: c.display,
      value: c.currency,
      checked: false,
      icon: c.icon,
    }));

    this.refreshPaymentMethodOptions();
  }

  refreshPaymentMethodOptions(): void {
    const selectedCurrencies = this.getSelectedValues(this.currencyOptions);

    if (!selectedCurrencies.length) {
      this.paymentMethodOptions = [];
      return;
    }

    const merged = new Map<string, NetworkOption>();

    PortalReportComponent.CURRENCY_CONFIG.filter((c) =>
      selectedCurrencies.includes(c.currency),
    ).forEach((c) => c.networks.forEach((n) => merged.set(n.code, n)));

    this.paymentMethodOptions = Array.from(merged.values()).map((n) => {
      const prev = this.paymentMethodOptions.find((o) => o.value === n.code);
      return {
        label: n.label,
        value: n.code,
        checked: prev ? prev.checked : false,
        icon: n.icon,
      };
    });
  }

  refreshAmountTypeOptions(): void {
    const creditRefOption = this.transactionTypeOptions.find(
      (o) => o.value === "CREDIT_REF",
    );
    const creditRefChecked = creditRefOption ? creditRefOption.checked : true;

    const source = creditRefChecked
      ? PortalReportComponent.ALL_AMOUNT_TYPE_OPTIONS
      : PortalReportComponent.ALL_AMOUNT_TYPE_OPTIONS.filter(
          (o) => o.value === "REWARD",
        );

    this.amountTypeOptions = source.map((opt) => {
      const prev = this.amountTypeOptions.find((o) => o.value === opt.value);
      return {
        ...opt,
        checked: prev ? prev.checked : opt.checked,
      };
    });
  }

  canSearch(): boolean {
    return this.allResults.length > 0 || !this.loading;
  }

  search(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredResults = [...this.allResults];

    this.currentPage = 1;
    this.applySearchAndSort();
  }

resetFilters(): void {
  this.toggleSelectAll(this.transactionTypeOptions, true);
  this.toggleSelectAll(this.transactionStatusOptions, true);
  this.toggleSelectAll(this.portalOptions, true);
  this.toggleSelectAll(this.comPartOptions, true);
  this.toggleSelectAll(this.currencyOptions, true);
  this.toggleSelectAll(this.paymentMethodOptions, true);

  this.rangeMode = "custom";
  this.activeQuickRange = null;
  this.fromMonth = "";
  this.toMonth = "";
  this.fromYear = new Date().getFullYear();
  this.toYear = new Date().getFullYear();
  this.setDefaultDateRange();

  this.searchTerm = "";
  this.sortColumn = null;
  this.sortDirection = "asc";
  this.currentPage = 1;
  this.errorMessage = null;

  this.selectedEntityType = this.currentUserRole?.toString().toLowerCase();
  this.selectedEntityId = this.currentUserId;
  this.entities = [];

  this.inventoryOptions = [];   // multi-select list clear
  this.loadingEntities = true;
  this.entities = [];

   this.inventoryReportData = [];
  this.showInventoryModal = false;
  this.applyFilters();
}

  onSearchChange(): void {
    this.currentPage = 1;
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
    const term = this.searchTerm.trim().toLowerCase();

    let rows = !term
      ? [...this.filteredResults]
      : this.filteredResults.filter((row) =>
          Object.values(row).some(
            (v) =>
              v !== null &&
              v !== undefined &&
              String(v).toLowerCase().includes(term),
          ),
        );

    if (this.sortColumn) {
      const col = this.sortColumn;
      const dir = this.sortDirection === "asc" ? 1 : -1;
      rows = rows.sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return av > bv ? dir : -dir;
      });
    }

    this.results = rows;
    this.updatePagination();
  }

  private updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedResults = this.results.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.results.length / this.pageSize));
  }

  get pageStart(): number {
    return this.results.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.results.length);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const windowSize = Math.min(4, total);
    let start = Math.max(1, this.currentPage - Math.floor(windowSize / 2));
    let end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  trackByColKey(index: number, col: { key: string; label: string }): string {
    return col.key;
  }

  displayValue(value: any): string {
    return value === null || value === undefined || value === "" ? "-" : value;
  }

  statusClass(status: string): string {
    switch ((status || "").toUpperCase()) {
      case "SETTLED":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "DISPUTED":
        return "bg-indigo-50 text-indigo-600 border border-indigo-100";
      case "EXPOSURE":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      case "THREAD":
        return "bg-sky-50 text-sky-600 border border-sky-100";
      default:
        return "bg-gray-50 text-gray-500 border border-gray-200";
    }
  }

  amountTypePillClass(): string {
    return "border border-[var(--color-border)] text-[var(--color-font)] bg-[var(--color-surface)]";
  }

  exportCsv(): void {
    if (!this.results.length) return;

    const headers = this.columns.map((c) => c.label);
    const rows = this.results.map((row) =>
      this.columns.map((c) => this.displayValue(row[c.key])),
    );

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "-").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `portal-report-${this.fromDate}-to-${this.toDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.results.length) return;

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text("Portal Report", 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `${this.fromDate} to ${this.toDate} | ${this.results.length} records`,
      14,
      21,
    );

    const head = ["Sr No", ...this.columns.map((c) => c.label)];
    const body = this.results.map((row, index) => [
      index + 1,
      ...this.columns.map((c) => this.displayValue(row[c.key])),
    ]);

    autoTable(doc, {
      head: [head],
      body,
      startY: 26,
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [4, 120, 87] },
    });

    doc.save(`portal-report-${this.fromDate}-to-${this.toDate}.pdf`);
  }

  formatTransactionDate(value: any): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";

    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  formatTransactionTime(value: any): string {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
  }

  transactionTypeClass(type: string): string {
    switch ((type || "").toUpperCase()) {
      case "ACCEPT_BANK":
        return "bg-blue-50 text-blue-700 border border-blue-100";
      case "ACCEPT_UPI":
        return "bg-cyan-50 text-cyan-700 border border-cyan-100";
      case "PAYOUT":
        return "bg-rose-50 text-rose-700 border border-rose-100";
      case "PAYIN":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "PPI":
        return "bg-violet-50 text-violet-700 border border-violet-100";
      case "RPI":
        return "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100";
      case "CREDIT_REF":
        return "bg-amber-50 text-amber-700 border border-amber-100";
      default:
        return "bg-gray-50 text-gray-600 border border-gray-200";
    }
  }

  get isAmountTypeDisabled(): boolean {
    const creditRefOption = this.transactionTypeOptions.find(
      (o) => o.value === "CREDIT_REF",
    );
    return !(creditRefOption ? creditRefOption.checked : true);
  }

  get isEntitySameAsCurrentRole(): boolean {
  return (
    this.selectedEntityType?.toString().toLowerCase() ===
    this.currentUserRole?.toString().toLowerCase()
  );
}

selectEntityType(type: any): void {
  const value = (type?.value ?? type?.id ?? type)?.toString().toLowerCase();
  if (!value || value === this.selectedEntityType) {
    this.activeDropdown = null;
    return;
  }

  this.selectedEntityType = value;
  this.activeDropdown = null;

  // Case 1: same as current role -> self, no API call
 if (value === this.currentUserRole?.toString().toLowerCase()) {
  this.entities = [];
  this.selectedEntityId = this.currentUserId;
  this.loadingEntities = false;

  this.loadInventoryOptions();
  return;
}

  // Case 2: down-level role -> fetch entity list
  this.selectedEntityId = null;
  this.loadingEntities = true;
  this.entities = [];

  const sub = this.userService
    .getByRole(this.currentUserId, value.toUpperCase())
    .subscribe({
      next: (res: any) => {
        let list = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (Array.isArray(res?.data)) {
          list = res.data;
        } else if (Array.isArray(res?.data?.data)) {
          list = res.data.data;
        } else if (Array.isArray(res?.data?.data?.data)) {
          list = res.data.data.data;
        }

        this.entities = list.map((item: any) => ({
          id: String(item.id),
          name: item.name,
        }));
        this.loadingEntities = false;
      },
      error: () => {
        this.entities = [];
        this.loadingEntities = false;
      },
    });

  this.subs.push(sub);
}

selectEntity(entity: { id: string; name: string }): void {
  this.selectedEntityId = entity.id;
  this.activeDropdown = null;

  this.loadInventoryOptions();
}

getEntityTypeLabel(): string {
  if (!this.selectedEntityType) return "Select Entity Type";
  const found = (this.entityTypes || []).find(
    (t: any) => t.value?.toLowerCase() === this.selectedEntityType,
  );
  return found ? found.name : this.selectedEntityType;
}

getEntityLabel(): string {
  if (this.isEntitySameAsCurrentRole) return "Self";
  if (this.loadingEntities) return "Loading...";
  const found = this.entities.find((e) => e.id === this.selectedEntityId);
  return found ? found.name : "Select Entity";
}

selectInventory(inventory: InventoryOption): void {
  this.selectedInventoryId = inventory.id;
  this.activeDropdown = null;
}

getInventoryLabel(): string {
  if (this.loadingInventory) {
    return "Loading...";
  }

  if (!this.getSelectedValues(this.paymentMethodOptions).length) {
    return "Select Payment Method First";
  }

  return this.getGroupLabel(this.inventoryOptions, "Select Inventory");
}

get hasInventoryReportData(): boolean {
  return this.inventoryReportData.length > 0;
}

openInventoryModal(): void {
  if (!this.hasInventoryReportData) return;
  this.showInventoryModal = true;
}

closeInventoryModal(): void {
  this.showInventoryModal = false;
}

inventoryStatusClass(type: string): string {
  return this.transactionTypeClass(type);
}

getInventoryName(id: any): string {
  if (id === null || id === undefined || id === '') return '-';

  const found = this.inventoryOptions.find(
    (opt) => opt.value === String(id)
  );

  return found ? found.label : String(id); // fallback: id hi dikha do agar naam na mile
}
}