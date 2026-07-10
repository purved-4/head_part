import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subscription, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { ViewChild, ElementRef } from "@angular/core";

import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { Input } from "@angular/core";
import { BankService } from "../../../pages/services/bank.service";
import { UserStateService } from "../../../store/user-state.service";
import { HeadService } from "../../../pages/services/head.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { UpiService } from "../../../pages/services/upi.service";
import { INDIAN_BANKS } from "../../../utils/constants";
import { BranchService } from "../../../pages/services/branch.service";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";

type StatusString = "active" | "inactive" | "frozen" | string;

interface BankAccount {
  id: string;
  branchId?: string | null;
  portal?: string;
  portalDomain?: string;
  accountHolderName: string;
  accountNo: string;
  accountType: string;
  status: StatusString;
  bankCode?: any;
  bankRange?: string;
  createdAt?: Date | string | null;
  limitAmount: string;
  minAmount: string;
  maxAmount: string;
  portalId?: string;
  allotStatus?: string;
  bankName?: any;
  limitTime?: string | null;
  isBankActive?: boolean;
  currency?: string;
  fttAcceptance?: boolean;
  upiCount?: any;
  ranges?: any;
  bankTime?: string | null; // ADD THIS
  liveAssigned?: boolean; // ADD THIS
  remainingLimitAmount: any;
  totalLimitAmount: any;
}

interface Portal {
  portalId: string;
  portalDomain: string;
  currency: string;
}

@Component({
  selector: "app-banks",
  templateUrl: "./banks.component.html",
  styleUrl: "./banks.component.css",
})
export class BanksComponent implements OnInit, OnDestroy {
  @ViewChild("portalDropdown") portalDropdown!: ElementRef;
  @ViewChild("qrcodeElem", { static: false }) qrcodeElem!: ElementRef;
  @Input() currency: any = ""; //  ADD THIS
  // ---------- DATA (server‑paginated) ----------
  bankAccounts: BankAccount[] = [];
  totalElements = 0;
  totalPagesCount = 0;
  loading = false;
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  activeCapacityPopup: any = null;
  showInventoryModal = false;
  tooltipData: any = null;
  showPaymentDropdown = false;
  selectedMethod = "bank";
  statusFilter: string = "all";
  minLimitDateTime: string = "";
  payinStatus: any = false;
  // ---------- FILTERS (sent to backend) ----------
  searchTerm = ""; // unified search (accountNo, holder, IFSC, portal)
  filterStatus = ""; // 'active', 'inactive', '' (empty = all)
  selectedPortal: Portal | null = null;
  minAmount: number | null = null;
  maxAmount: number | null = null;
  maxLimit: number | null = null; // max limit filter
  showTxnModal = false;
  selectedTxnData: any = null;
  confirmStatusChecked: boolean = false;
  private countdownInterval: any;
  showStatusModal = false;
  selectedAccount: any = null;
  pendingToggleValue = false;
  toggleEvent: any = null;
  selectedCapacityAccount: any = null;
  pageNumbers: number[] = [];
  selectedLimitAccount: BankAccount | null = null;
  hoveredLimitAccount: BankAccount | null = null;
  tooltipPosition = { x: 0, y: 0 };

  showAddUpiModal = false;
  isAddingUpi = false;

  addUpiForm!: FormGroup;
  selectedBank: any = null;

  hoverTimeout: any;
  capacityPopupTop = 0;
  capacityPopupLeft = 0;
  // Calendar picker state
  monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  viewYear!: number;
  viewMonth!: number;
  pickerSelectedDay!: number;
  pickerSelectedMonth!: number;
  pickerSelectedYear!: number;
  pickerHour!: number;
  pickerMinute!: string;
  pickerAmPm: "AM" | "PM" = "AM";
  calendarCells: any[] = [];
  //new
  selectedCurrencyData: any = null;
  selectedModeData: string = "";
  private currencySub!: Subscription;
  private modeSub!: Subscription;

  // UI toggle for amount filter section
  showAmountFilter = false;

  //bank details
  selectedBankAccount: BankAccount | null = null;
  showBankDetailsModal = false;
  //new
  draftSearchTerm = "";
  draftMaxLimit: number | null = null;
  draftStatusFilter = "all";
  // ---------- PAGINATION ----------

  currentPage = 1;
  pageSize = 6;
  Math = Math;
  selectedBankForUpi: any = null;
  openUpiModal = false;
  // ---------- ADD MODAL ----------
  showAddModal = false;
  isAdding = false;
  portals: Portal[] = [];
  addBankForm: FormGroup;

  // ---------- UPDATE MODAL ----------

  editingAccount: BankAccount | null = null;

  isSubmitting = false;

  showLimitModal: boolean = false;
  limitDateTime: any;
  isSubmittingLimit: boolean = false;
  // For update modal bank dropdown

  currentRoleId: any;
  currentUserId: any;
  role: any;

  // ---------- ACTION DROPDOWN ----------
  activeActionDropdown: string | null = null;
  isUpdatingStatus: { [key: string]: boolean } = {};

  // Add these properties to your component class
  bankSearchTerm: string = "";
  filteredBanks: string[] = INDIAN_BANKS;
  showBankDropdown: boolean = false;
  isCustomBank: boolean = false;

  // ---------- SUBSCRIPTION MANAGEMENT ----------
  private subs = new Subscription();
  private searchSubject = new Subject<string>();
  // ---------- COMPUTED: active filters count ----------
  get activeFilters(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.statusFilter) count++;
    // if (this.filterStatus) count++;
    if (this.selectedPortal) count++;
    if (this.minAmount !== null || this.maxAmount !== null) count++;
    if (this.maxLimit !== null && this.maxLimit > 0) count++;
    return count;
  }

  selectedPortals: [] = [];

  viewMode: "table" | "grid" = "table";
  capacityRanges: {
    minRange: number | null;
    maxRange: number | null;
    quantity: number | null;
  }[] = [{ minRange: null, maxRange: null, quantity: null }];
  isEditingCapacity: boolean = false;
  showCapacityModal: boolean = false;
  capacityData: any[] = [];
  isLoadingCapacity: boolean = false;

  qrMode: "generate" | "upload" = "generate";
  selectedImage: string | null = null;
  generatingQr = false;

  // already present but ensure
  qrData: string | null = null;
  generatedFile: File | null = null;
  manualQrFile: File | null = null;
  constructor(
    private route: ActivatedRoute,
    private bankService: BankService,
    private fb: FormBuilder,
    private userStateService: UserStateService,
    private headService: HeadService,
    private snack: SnackbarService,
    private router: Router,
    private elementRef: ElementRef,
    private upiService: UpiService,
    private branchService: BranchService,
    private currencyBehaviourService: CurrencyBehaviourService,
  ) {
    this.addBankForm = this.createAddBankForm();
  }

  ngOnInit() {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    // =========================
    // GET CURRENCY
    // =========================

    this.currencySub = this.currencyBehaviourService
      .getCurrency()
      .subscribe((res) => {
        if (!res) return;

        this.selectedCurrencyData = res;

        this.currency = res.currency;

        // API CALL
        this.fetchBankAccounts();
      });

    // =========================
    // GET MODE
    // =========================

    this.modeSub = this.currencyBehaviourService.getMode().subscribe((res) => {
      if (!res) return;

      this.selectedModeData = res;
    });

    this.getPayinStatus();

    this.initAddUpiForm();

    this.searchSubject
      .pipe(debounceTime(600), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm = value;
        this.currentPage = 1;
      });
    this.countdownInterval = setInterval(() => {
      this.bankAccounts = [...this.bankAccounts];
    }, 1000);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();

    if (this.currencySub) {
      this.currencySub.unsubscribe();
    }

    if (this.modeSub) {
      this.modeSub.unsubscribe();
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  getUsedAmount(account: BankAccount): any {
    const limitAmount = Number(account.limitAmount || 0);
    const remaining = Number(account.remainingLimitAmount || 0);

    return Math.max(limitAmount - remaining, 0);
  }
  // ========== DATA FETCH (server‑side paginated) ==========
  fetchBankAccounts(): void {
    if (!this.currentRoleId) return;

    this.loading = true;

    const options: any = {
      page: this.currentPage - 1,
      size: this.pageSize,
      query: this.searchTerm.trim() || undefined,

      limit: this.maxLimit ?? undefined,
      portalId: this.selectedPortal?.portalId || undefined,
      status: this.statusFilter || undefined,
    };

    const sub = this.bankService
      .getBankDataWithSubAdminIdAndActivePaginated(this.currentRoleId, options)
      .pipe(
        catchError((err) => {
          this.loading = false;
          return of({ data: [], totalElements: 0, totalPages: 0 });
        }),
      )
      .subscribe((res: any) => {
        this.loading = false;

        // Handle different possible response structures
        const rows: any[] = Array.isArray(res.data?.content)
          ? res.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];

        this.bankAccounts = rows
          .map((r: any) => {
            let status: StatusString = "inactive";

            if (typeof r.status === "boolean") {
              status = r.status ? "active" : "inactive";
            } else if (typeof r.status === "string" && r.status.trim() !== "") {
              status = r.status.toLowerCase() as StatusString;
            } else if (typeof r.active === "boolean") {
              status = r.active ? "active" : "inactive";
            }

            let accountType = r.accountType ?? "";
            if (accountType.toLowerCase() === "savings") {
              accountType = "saving";
            }

            const isBankActive = status === "active";
            return {
              id: r.id,
              branchId: r.branchId ?? null,
              liveAssigned: r.liveAssigned ?? false,
              portal: r.portalDomain ?? null,
              portalId: r.portal ?? null,
              portalDomain: r.portalDomain ?? null,
              allotStatus: r.allotStatus ?? false,
              accountHolderName: r.accountHolderName ?? r.name ?? "-",
              bankName: r.bankName ?? "",
              accountNo: r.accountNo ?? r.accountNumber ?? "",
              accountType,
              status,
              bankCode: r.bankCode ?? "",
              bankRange: r.bankRange ?? r.range ?? "",
              createdAt: r.createdAt ? new Date(r.createdAt) : null,
              limitAmount: r.limitAmount ?? "",
              currency: r.portalCurrency || "",
              ranges: r.ranges ?? [],
              limitTime: r.limitTime ?? null,
              fttAcceptance: r.fttAcceptance ?? true,
              totalLimitAmount: r.totalLimitAmount,
              remainingLimitAmount: r.remainingLimitAmount,

              upiCount: r.upiCount ?? null,
              bankTime: r.bankTime ?? null, // ADD

              isBankActive,
            } as BankAccount;
          })
          .sort((a, b) => {
            const aTime = a.limitTime ? new Date(a.limitTime).getTime() : 0;
            const bTime = b.limitTime ? new Date(b.limitTime).getTime() : 0;
            return bTime - aTime;
          });
        this.totalElements = res.totalElements ?? res.data?.totalElements ?? 0;
        this.totalPagesCount = res.totalPages ?? res.data?.totalPages ?? 0;
      });

    this.subs.add(sub);
  }

  isAccountActive(account: any): boolean {
    const now = Date.now();
    const limitTime = account.limitTime
      ? new Date(account.limitTime).getTime()
      : null;

    const bankTime = account.bankTime
      ? new Date(account.bankTime).getTime()
      : null;

    const status =
      account.status === "active"
        ? true
        : bankTime != null
          ? bankTime > now
          : false;
    if (limitTime !== null && limitTime > now && status) {
      return true;
    }
    return false;
  }

  getBankRemainingTime(account: any): string {
    if (!account?.bankTime) {
      return "";
    }

    const diff = new Date(account.bankTime).getTime() - Date.now();

    if (diff <= 0) {
      return "";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    return ` ${minutes}m ${seconds}s`;
  }
  // ========== FILTER ACTIONS ==========
  onSearch(): void {
    this.currentPage = 1;
    this.fetchBankAccounts();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.fetchBankAccounts();
  }

  clearMinMaxFilter(): void {
    this.minAmount = null;
    this.maxAmount = null;
    this.onFilterChange();
  }

  clearLimitFilter(): void {
    this.maxLimit = null;
    this.onFilterChange();
  }

  resetFilters(): void {
    // actual
    this.searchTerm = "";
    this.maxLimit = null;
    this.statusFilter = "all";

    // draft
    this.draftSearchTerm = "";
    this.draftMaxLimit = null;
    this.draftStatusFilter = "all";

    this.selectedPortal = null;
    this.minAmount = null;
    this.maxAmount = null;

    this.currentPage = 1;
    this.fetchBankAccounts();
  }

  // ========== PAGINATION ==========
  totalPages(): number {
    return this.totalPagesCount;
  }

  private updatePageNumbers(): void {
    const total = this.totalPages();
    const current = this.currentPage;

    const pages: number[] = [];

    const start = Math.max(1, current - 1);
    const end = Math.min(total, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    this.pageNumbers = pages;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchBankAccounts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
      this.fetchBankAccounts();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage) {
      this.currentPage = page;
      this.fetchBankAccounts();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchBankAccounts();
  }

  // ========== FORM METHODS (unchanged, but use toasts) ==========

  private createAddBankForm(): FormGroup {
    return this.fb.group(
      {
        // portal: ["", Validators.required],
        bankName: ["", Validators.required], // Add this line
        accountNumber: [
          "",
          [Validators.required, Validators.pattern(/^\d{10,20}$/)],
        ],
        accountHolderName: ["", [Validators.required, Validators.minLength(3)]],
        bankCode: [
          "",
          [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)],
        ],
        accountType: ["", Validators.required],
        limitAmount: [
          "",
          [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
        ],

        fttAcceptance: [true],
      },
      // { validators: this.accountNumberMatchValidator },
    );
  }

  private accountNumberMatchValidator(g: FormGroup) {
    const acc = g.get("accountNumber")?.value;
    const conf = g.get("confirmAccountNumber")?.value;
    return acc === conf ? null : { mismatch: true };
  }

  onAccountNumberChange() {
    if (this.addBankForm.get("confirmAccountNumber")?.value) {
      this.addBankForm.updateValueAndValidity();
    }
  }

  // ========== ACTION DROPDOWN ==========
  toggleActionDropdown(accountId: string, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.activeActionDropdown =
      this.activeActionDropdown === accountId ? null : accountId;
  }

  // @HostListener("document:click")
  // onDocumentClick() {
  //   this.activeActionDropdown = null;
  // }

  // ========== FORM SUBMISSION ==========

  // ========== UTILITY METHODS ==========
  getStatusClass(status: string): string {
    switch ((status || "").toLowerCase()) {
      case "active":
        return "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20";
      case "inactive":
        return "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20";
      case "frozen":
        return "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20";
      default:
        return "bg-[var(--color-muted)]/10 text-[var(--color-muted)] border-[var(--color-muted)]/20";
    }
  }

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return "";
    if (accountNumber.length <= 4) return accountNumber;
    return "*".repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  }

  getAccountTypeLabel(accountType: string): string {
    switch ((accountType || "").toLowerCase()) {
      case "saving":
        return "Saving Account";
      case "current":
        return "Current Account";
      case "salary":
        return "Salary Account";
      default:
        return accountType || "-";
    }
  }

  formatCurrency(amount: string): string {
    if (amount === null || amount === undefined) return "-";

    const num = parseFloat(amount);

    if (isNaN(num)) return "-";

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }

  formatCurrencyShort(amount: string): string {
    if (amount === null || amount === undefined) return "-";

    const num = parseFloat(amount);

    if (isNaN(num)) return "-";

    if (num >= 10000000) {
      return (num / 10000000).toFixed(1).replace(/\.0$/, "") + "Cr";
    } else if (num >= 100000) {
      return (num / 100000).toFixed(1).replace(/\.0$/, "") + "L";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }

    return num.toString(); // this will correctly return 0
  }
  toggleBankStatus(bankId: string) {
    this.bankService.toogleBankDeleted(bankId).subscribe({
      next: (res: any) => {
        this.snack.show(res?.message || "bank deleted", true);

        this.fetchBankAccounts();
      },
      error: (err) => {
        console.error(err);

        this.snack.show(
          err.error?.message || "failed to delete the bank",
          false,
        );
      },
    });
  }

  toggleView(mode: "table" | "grid") {
    this.viewMode = mode;
  }
  onSearchInput(value: string) {
    this.searchSubject.next(value);
  }

  // Add these methods to your component class
  filterBanks(): void {
    const term = this.bankSearchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredBanks = INDIAN_BANKS;
    } else {
      this.filteredBanks = INDIAN_BANKS.filter((bank) =>
        bank.toLowerCase().includes(term),
      );
    }
  }

  onBankInputFocus(): void {
    this.showBankDropdown = true;
    this.filteredBanks = INDIAN_BANKS;
  }

  onBankInputBlur(): void {
    setTimeout(() => {
      this.showBankDropdown = false;
    }, 200);
  }

  onBankInputChange(): void {
    const value = this.addBankForm.get("bankName")?.value || "";
    this.bankSearchTerm = value;

    const term = value.toLowerCase().trim();

    this.filteredBanks = INDIAN_BANKS.filter((bank) =>
      bank.toLowerCase().includes(term),
    );

    this.isCustomBank =
      value.trim() !== "" &&
      !INDIAN_BANKS.some((bank) => bank.toLowerCase() === value.toLowerCase());
  }

  selectBank(bank: string): void {
    this.addBankForm.patchValue({ bankName: bank });
    this.showBankDropdown = false;
    this.isCustomBank = false;
  }

  selectCustomBank(): void {
    const customName = this.bankSearchTerm.trim();

    if (!customName) return;

    this.addBankForm.patchValue({ bankName: customName });
    this.isCustomBank = true;
    this.showBankDropdown = false;
  }

  clearBankSelection(): void {
    this.addBankForm.patchValue({ bankName: "" });
    this.filteredBanks = INDIAN_BANKS;
    this.isCustomBank = false;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest(".action-dropdown-wrapper")) {
      this.activeActionDropdown = null;
    }

    if (!target.closest(".payment-dropdown-wrapper")) {
      this.showPaymentDropdown = false;
    }

    if (!target.closest(".capacity-popup") && !target.closest("button")) {
      this.selectedCapacityAccount = null;
    }
  }

  changePaymentType(type: string): void {
    this.selectedMethod = type;
    this.showPaymentDropdown = false;

    this.router.navigate(["../", type], {
      relativeTo: this.route,
    });
  }

  openLimitModal(account: any) {
    this.editingAccount = account;
    this.showLimitModal = true;

    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.pickerSelectedDay = now.getDate();
    this.pickerSelectedMonth = now.getMonth();
    this.pickerSelectedYear = now.getFullYear();

    let h = now.getHours();
    this.pickerAmPm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    this.pickerHour = h;
    this.pickerMinute = String(now.getMinutes()).padStart(2, "0");

    this.buildCalendar();
  }
  buildCalendar(): void {
    this.calendarCells = [];
    const today = new Date();
    const todayMid = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(
      this.viewYear,
      this.viewMonth + 1,
      0,
    ).getDate();
    const prevDays = new Date(this.viewYear, this.viewMonth, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      this.calendarCells.push({
        day: prevDays - firstDay + 1 + i,
        date: null,
        isPast: true,
        isToday: false,
        isSelected: false,
        isOtherMonth: true,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(this.viewYear, this.viewMonth, d);
      const isPast = cellDate < todayMid;
      const isToday = cellDate.getTime() === todayMid.getTime();
      const isSelected =
        d === this.pickerSelectedDay &&
        this.viewMonth === this.pickerSelectedMonth &&
        this.viewYear === this.pickerSelectedYear;
      this.calendarCells.push({
        day: d,
        date: cellDate,
        isPast,
        isToday,
        isSelected,
        isOtherMonth: false,
      });
    }
    const remaining = 42 - this.calendarCells.length;
    for (let d = 1; d <= remaining; d++) {
      this.calendarCells.push({
        day: d,
        date: null,
        isPast: true,
        isToday: false,
        isSelected: false,
        isOtherMonth: true,
      });
    }
  }

  selectCalendarDay(cell: any): void {
    if (!cell.date || cell.isPast || cell.isOtherMonth) return;
    this.pickerSelectedDay = cell.day;
    this.pickerSelectedMonth = this.viewMonth;
    this.pickerSelectedYear = this.viewYear;
    this.buildCalendar();
  }

  prevMonth(): void {
    if (this.isCurrentMonthView()) return;
    if (--this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear--;
    }
    this.buildCalendar();
  }

  nextMonth(): void {
    if (++this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear++;
    }
    this.buildCalendar();
  }

  isCurrentMonthView(): boolean {
    const now = new Date();
    return (
      this.viewMonth === now.getMonth() && this.viewYear === now.getFullYear()
    );
  }

  clampPickerHour(): void {
    let h = Number(this.pickerHour);
    if (isNaN(h) || h < 1) h = 1;
    if (h > 12) h = 12;
    this.pickerHour = h;
  }

  clampPickerMinute(): void {
    let m = Number(this.pickerMinute);
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;
    this.pickerMinute = String(m).padStart(2, "0");
  }
  submitLimitTime() {
    // Build limitDateTime from picker state
    let hour = this.pickerHour;
    if (this.pickerAmPm === "PM" && hour !== 12) hour += 12;
    if (this.pickerAmPm === "AM" && hour === 12) hour = 0;

    const selected = new Date(
      this.pickerSelectedYear,
      this.pickerSelectedMonth,
      this.pickerSelectedDay,
      hour,
      Number(this.pickerMinute),
      0,
    );
    this.limitDateTime = new Date(
      selected.getTime() - selected.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);

    // baaki sab same rehta hai
    if (!this.limitDateTime || !this.editingAccount) return;
    const selectedTime = new Date(this.limitDateTime).getTime();
    const nowTime = new Date().getTime();
    if (selectedTime < nowTime) {
      this.snack.show("Please select a future date and time", false);
      return;
    }
    this.isSubmittingLimit = true;
    const payload = { dateTime: this.limitDateTime };
    const id = this.editingAccount.id;
    this.bankService.setLimitTime(id, payload).subscribe({
      next: (res) => {
        this.snack.show("Limit time set successfully", true);
        this.closeLimitModal();
        this.isSubmittingLimit = false;
        this.fetchBankAccounts();
      },
      error: (err) => {
        this.snack.show(
          err?.error?.message || "Failed to set limit time",
          false,
        );
        this.isSubmittingLimit = false;
      },
    });
  }

  closeLimitModal() {
    this.showLimitModal = false;
    this.limitDateTime = "";
    this.minLimitDateTime = "";
  }

  updateFrom(index: number, event: any) {
    const value = event.target.value;

    this.capacityRanges[index].minRange =
      value === "" || value === null ? null : Number(value);
  }

  updateTo(index: number, event: any) {
    const value = event.target.value;

    this.capacityRanges[index].maxRange =
      value === "" || value === null ? null : Number(value);
  }

  updateQuantity(index: number, event: any) {
    const value = event.target.value;

    this.capacityRanges[index].quantity =
      value === "" || value === null ? null : Number(value);
  }
  addRange() {
    const last = this.capacityRanges[this.capacityRanges.length - 1];

    if (
      last.minRange == null ||
      last.maxRange == null ||
      last.quantity == null
    ) {
      this.snack.show("Please fill all range fields first.", false);
      return;
    }

    if (last.minRange <= 0 || last.maxRange <= 0 || last.quantity <= 0) {
      this.snack.show("Range values must be greater than 0.", false);
      return;
    }

    if (last.maxRange <= last.minRange) {
      this.snack.show("'To' must be greater than 'From'.", false);
      return;
    }

    this.capacityRanges.push({
      minRange: null,
      maxRange: null,
      quantity: null,
    });
  }

  removeRange(index: number) {
    this.capacityRanges.splice(index, 1);

    if (this.capacityRanges.length === 0) {
      this.capacityRanges = [
        {
          minRange: null,
          maxRange: null,
          quantity: null,
        },
      ];
    }
  }

  closeCapacityModal() {
    this.showCapacityModal = false;
    this.capacityData = [];
  }

  enableCapacityEdit() {
    this.isEditingCapacity = true;
  }

  selectedId!: string;
  selectedPortalId!: string;
  selectedPayinId!: string;
  selectedMode!: "UPI" | "BANK";

  openCapacity(item: any, mode: "UPI" | "BANK") {
    this.selectedId = item.id;

    this.selectedPortalId = item.portalId || item.portal || item.portalID;

    this.selectedPayinId = item.payinId || item.id || item.qrId;

    this.selectedMode = mode;

    console.log(" FINAL PASS:", {
      entityId: this.selectedId,
      portalId: this.selectedPortalId,
      payinId: this.selectedPayinId,
    });

    this.showCapacityModal = true;
  }
  //bank toggle status
  toggleCandidateBank: BankAccount | null = null;
  isBankToggleConfirmVisible = false;
  clickEvent: Event | null = null; // hold original click event

  // Open confirmation modal
  openBankToggleConfirm(bank: BankAccount, event: Event) {
    event.preventDefault(); // prevent immediate toggle
    event.stopPropagation();
    this.clickEvent = event;

    this.toggleCandidateBank = bank;
    this.isBankToggleConfirmVisible = true;
  }

  // Close modal without changing
  closeBankToggleConfirm() {
    this.toggleCandidateBank = null;
    this.isBankToggleConfirmVisible = false;
  }

  executeBankToggle() {
    if (!this.toggleCandidateBank) return;

    const bank = this.toggleCandidateBank;

    this.bankService.toggleIsBank(bank.id).subscribe({
      next: (res: any) => {
        this.closeBankToggleConfirm();
        this.fetchBankAccounts();
        this.snack.show(res?.message || "Failed...", true);
      },
      error: (err) => {
        this.closeBankToggleConfirm();
        this.snack.show(err?.message || "Failed...", false);
      },
    });
  }

  onIfscInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formattedValue = input.value.replace(/\s/g, "").toUpperCase();

    this.addBankForm.get("bankCode")?.setValue(formattedValue, {
      emitEvent: false,
    });

    input.value = formattedValue;
  }

  isFutureLimitTime(limitTime: string | null | undefined): boolean {
    if (!limitTime) return false;
    return new Date(limitTime).getTime() > new Date().getTime();
  }

  isLastRows(index: number): boolean {
    return index >= this.bankAccounts.length - 2;
  }

  showLimitTooltip(account: BankAccount, event: MouseEvent): void {
    clearTimeout(this.hoverTimeout);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipWidth = 288;

    this.tooltipPosition = {
      x: rect.left + rect.width / 2 - tooltipWidth / 2,
      y: rect.bottom + 8, // ← below the button, not above
    };

    this.hoveredLimitAccount = account;
  }

  hideLimitTooltip(): void {
    this.hoverTimeout = setTimeout(() => {
      this.hoveredLimitAccount = null;
    }, 150);
  }

  clearHide() {
    clearTimeout(this.hoverTimeout);
  }
  private getPayinStatus() {
    if (this.role === "HEAD") {
      this.headService.getHeadById(this.currentRoleId).subscribe((res) => {
        this.payinStatus = res.payin;
      });
    } else if (this.role === "BRANCH") {
      this.branchService.getBranchById(this.currentRoleId).subscribe((res) => {
        this.payinStatus = res.payin;
      });
    }
  }
  changePayinStatus() {
    if (this.role === "HEAD") {
      this.headService
        .toggleDashbaordPayin(this.currentRoleId)
        .subscribe(() => {
          this.payinStatus = !this.payinStatus;
          this.fetchBankAccounts();
        });
    } else if (this.role === "BRANCH") {
      this.branchService
        .toggleDashbaordPayin(this.currentRoleId)
        .subscribe(() => {
          this.payinStatus = !this.payinStatus;
          this.fetchBankAccounts();
        });
    }
  }
  viewUpi(account: any) {
    const bankId = account?.id;
    if (!bankId) return;

    if (this.role === "HEAD") {
      this.router.navigate(["/head/upi"], {
        queryParams: { bankId, mode: "upi", paymentMethod: null },
        queryParamsHandling: "merge",
      });
    } else if (this.role === "BRANCH") {
      this.router.navigate(["/branch/upi"], {
        queryParams: { bankId, mode: "upi", paymentMethod: null },
        queryParamsHandling: "merge",
      });
    }
  }

  initAddUpiForm() {
    this.addUpiForm = this.fb.group({
      vpa: [
        "",
        [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/),
        ],
      ],
      bankId: [""],

      limitAmount: ["", [Validators.required, Validators.min(1)]],
    });
  }

  openAddUpiFromBank(account: any) {
    this.selectedBank = account;
    this.showAddUpiModal = true;

    document.body.style.overflow = "hidden";
  }

  closeAddUpiModal() {
    this.showAddUpiModal = false;
    this.addUpiForm.reset();
    this.generatedFile = null;
    this.manualQrFile = null;
    this.selectedBank = null;

    document.body.style.overflow = "auto";
  }

  submitAddUpi(): void {
    // mark fields touched
    Object.keys(this.addUpiForm.controls).forEach((key) =>
      this.addUpiForm.get(key)?.markAsTouched(),
    );

    // form validation
    if (this.addUpiForm.invalid) {
      this.snack.show("Please fill all required fields correctly.", false);
      return;
    }

    // QR validation
    if (!this.generatedFile && !this.manualQrFile) {
      this.snack.show("Please upload or generate QR code.", false);
      return;
    }

    // bank validation
    if (!this.selectedBank) {
      this.snack.show("Bank not selected.", false);
      return;
    }

    // ranges (reuse existing)
    const validRanges = this.capacityRanges
      .filter(
        (r) =>
          r.minRange != null &&
          r.maxRange != null &&
          r.quantity != null &&
          r.minRange > 0 &&
          r.maxRange > 0 &&
          r.quantity > 0,
      )
      .map((r) => ({
        minRange: r.minRange!,
        maxRange: r.maxRange!,
        quantity: r.quantity!,
      }));

    // payload
    const payload = {
      vpa: this.addUpiForm.value.vpa,
      limitAmount: this.addUpiForm.value.limitAmount,

      entityId: this.currentRoleId,
      entityType: this.role,
      userId: this.currentUserId,

      active: true,

      //  ONLY ADD THIS EXTRA FIELD
      bankId: this.selectedBank?.id,
      ranges: validRanges.length ? validRanges : null,

      createdAt: new Date().toISOString(),
    };

    // form data
    const formData = new FormData();
    formData.append(
      "dto",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );

    // file (QR)
    const fileToSend = this.generatedFile || this.manualQrFile;
    if (fileToSend) {
      formData.append("file", fileToSend, fileToSend.name);
    }

    if (this.currentUserId) {
      formData.append("userId", this.currentUserId);
    }

    this.isAddingUpi = true;

    this.upiService.add(formData).subscribe({
      next: (res: any) => {
        this.isAddingUpi = false;

        if (res?.success || res?.id || res?._id) {
          this.snack.show(res?.message || "UPI added successfully!", true);

          this.closeAddUpiModal();

          //  CORRECT REFRESH METHOD
          this.fetchBankAccounts();
        } else {
          this.snack.show(res?.message || "Failed to add UPI.", false);
        }
      },
      error: (err: any) => {
        this.isAddingUpi = false;

        this.snack.show(
          err?.error?.message || err?.error?.error || "Failed to add UPI",
          false,
        );
      },
    });
  }

  generateQrFromVpa(): void {
    const vpaControl = this.addUpiForm.get("vpa");

    if (!vpaControl || vpaControl.invalid) {
      vpaControl?.markAsTouched();
      return;
    }

    const vpa = String(vpaControl.value).trim();

    const upiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;

    this.qrData = upiIntent;
    this.generatingQr = true;

    setTimeout(() => this.captureQrImage(vpa), 300);
  }

  private captureQrImage(vpa: string): void {
    try {
      const qrcodeElement = this.qrcodeElem;

      if (!qrcodeElement?.nativeElement) {
        this.generatingQr = false;
        return;
      }

      setTimeout(() => {
        const canvas = qrcodeElement.nativeElement.querySelector("canvas");

        if (!canvas) {
          this.generatingQr = false;
          return;
        }

        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) {
              const filename = `upi_qr_${Date.now()}.png`;

              this.generatedFile = new File([blob], filename, {
                type: "image/png",
              });
            }

            this.generatingQr = false;
          },
          "image/png",
          1.0,
        );
      }, 100);
    } catch (error) {
      this.generatingQr = false;
    }
  }

  onQrFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.manualQrFile = file;
    this.generatedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  setQrMode(mode: "generate" | "upload") {
    this.qrMode = mode;

    this.qrData = null;
    this.generatedFile = null;
    this.manualQrFile = null;
    this.selectedImage = null;
  }

  removeQr() {
    this.qrData = null;
    this.generatedFile = null;
    this.manualQrFile = null;
    this.selectedImage = null;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addUpiForm.reset();
    this.qrData = null;
    this.generatedFile = null;
    this.isAddingUpi = false;
    this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];
    document.body.style.overflow = "auto";
    this.selectedImage = null;
    this.manualQrFile = null;
  }

  downloadQr(): void {
    if (!this.generatedFile) return;
    const url = URL.createObjectURL(this.generatedFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = this.generatedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  openTxnModal(account: any) {
    this.selectedTxnData = account;
    this.showTxnModal = true;
    document.body.style.overflow = "hidden";
  }

  closeTxnModal() {
    this.showTxnModal = false;
    this.selectedTxnData = null;
    document.body.style.overflow = "auto";
  }

  showCurrencyModal = false;

  openCurrencyModal(portal: any) {
    this.selectedPortal = portal;
    this.showCurrencyModal = true;
  }

  closeCurrencyModal() {
    this.showCurrencyModal = false;
  }

  // parent.component.ts

  openBankDetails(account: BankAccount): void {
    this.selectedBankAccount = account;
    this.showBankDetailsModal = true;
  }

  closeBankDetails(): void {
    this.showBankDetailsModal = false;
    this.selectedBankAccount = null;
  }
  refreshBankAccounts = () => {
    this.fetchBankAccounts();
  };
  copyText(value: string, message: string): void {
    if (!value) return;

    navigator.clipboard.writeText(value);

    this.snack.show(message, true);
  }

  toggleCapacityPopup(accountId: any) {
    this.activeCapacityPopup =
      this.activeCapacityPopup === accountId ? null : accountId;
  }

  openCapacityPreview(account: any, event: MouseEvent) {
    console.log("ACCOUNT =>", account);
    console.log("RANGES =>", account?.ranges);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    this.selectedCapacityAccount = account;

    const popupWidth = 280;

    // Approx dynamic height
    const rows = account?.ranges?.length || 0;
    const popupHeight = Math.max(120, rows * 56 + 70);

    // Center align with clicked icon/button
    let left = rect.left + rect.width / 2 - popupWidth / 2;
    let top = rect.bottom + 8;

    // If bottom overflow -> show above
    if (top + popupHeight > window.innerHeight) {
      top = rect.top - popupHeight - 8;
    }

    // If still going outside top
    if (top < 10) {
      top = 10;
    }

    // Horizontal boundaries
    if (left < 10) {
      left = 10;
    }

    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }

    this.capacityPopupTop = top;
    this.capacityPopupLeft = left;
  }
  closeCapacityPopup() {
    this.selectedCapacityAccount = null;
  }

  openStatusModal(account: any, event: any): void {
    event.preventDefault();

    this.selectedAccount = account;
    this.pendingToggleValue = event.target.checked;
    this.toggleEvent = event;

    // reset checkbox every time modal opens
    this.confirmStatusChecked = false;

    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    if (this.toggleEvent) {
      this.toggleEvent.target.checked = !this.pendingToggleValue;
    }

    this.confirmStatusChecked = false;
    this.showStatusModal = false;
    this.selectedAccount = null;
    this.toggleEvent = null;
  }

  confirmStatusChange(): void {
    if (!this.selectedAccount) return;
    if (!this.confirmStatusChecked) {
      this.snack.show(
        "Please confirm by checking the checkbox before proceeding",
        false,
      );
      return;
    }

    this.onToggleStatus(this.selectedAccount, this.toggleEvent);

    this.showStatusModal = false;
    this.fetchBankAccounts();
  }

  onToggleStatus(account: any, event: any) {
    const newStatus = event.target.checked;
    const bankID = account.id;

    this.bankService.toggleIsBank(bankID).subscribe({
      next: (res) => {
        // update instantly
        account.isBankActive = newStatus;

        account.status = newStatus ? "active" : "inactive";

        this.snack.show(res.message || "Status updated", true);
        this.fetchBankAccounts();
      },

      error: (err) => {
        // revert toggle
        event.target.checked = !newStatus;

        account.isBankActive = !newStatus;

        this.snack.show(err.error?.message || "Failed to update status", false);
      },
    });
  }

  openAddBankModal() {
    this.showInventoryModal = true;
  }

  closeInventoryModal() {
    this.showInventoryModal = false;
  }
  applyFilters(): void {
    this.searchTerm = this.draftSearchTerm;
    this.maxLimit = this.draftMaxLimit;
    this.statusFilter = this.draftStatusFilter;

    this.currentPage = 1;
    this.fetchBankAccounts();
  }

  openLimitDetails(account: BankAccount): void {
    this.selectedLimitAccount = account;
  }

  closeLimitDetails(): void {
    this.selectedLimitAccount = null;
  }
}
