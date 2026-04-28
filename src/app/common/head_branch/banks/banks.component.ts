import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subscription, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { ViewChild, ElementRef } from "@angular/core";
// import {

//   PortalInfo,
// } from "../../../services/portal-sharing.service";
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
  ifsc?: string;
  bankRange?: string;
  createdAt?: Date | string | null;
  limitAmount: string;
  minAmount: string;
  maxAmount: string;
  portalId?: string;
  allotStatus?:string;
  bankName?: string;
  limitTime?: string | null;
  isBankActive?: boolean;
  currency?: string;
  min_tran_count?: number;
  // max_tran_count?: number;
  min_total_tran_amount?: number;
  // max_total_tran_amount?: number;
}

interface Portal {
  portalId: string;
  portalDomain: string;
  currency: string;
  // portal:string;
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
  // UI state for portal filter dropdown
  portalSearchTerm = "";
  showPortalDropdown = false;
  filteredPortals: Portal[] = [];

  // UI toggle for amount filter section
  showAmountFilter = false;

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
  showDebug = false; // kept for debug, but you can remove

  // Modal portal search
  modalPortalSearch = "";
  modalFilteredPortals: Portal[] = [];
  selectedModalPortal: Portal | null = null;
  showModalPortalDropdown = false;

  // ---------- UPDATE MODAL ----------
  showUpdateModal = false;
  editingAccount: BankAccount | null = null;
  updateForm: any = {
    accountNo: "",
    accountHolderName: "",
    ifsc: "",
    limitAmount: "",
    accountType: "saving",
    status: true,
    minAmount: "",
    maxAmount: "",
    bankName: "",
    min_tran_count: null,
    // max_tran_count: null,
    min_total_tran_amount: null,
    // max_total_tran_amount: null,
  };
  isSubmitting = false;

  showLimitModal: boolean = false;
  limitDateTime: any;
  isSubmittingLimit: boolean = false;
  // For update modal bank dropdown
  updateBankSearchTerm = "";
  updateFilteredBanks: string[] = INDIAN_BANKS;
  updateShowBankDropdown = false;
  updateIsCustomBank = false;
  // ---------- USER / ROLE ----------
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
  ) {
    this.addBankForm = this.createAddBankForm();
  }

  ngOnInit() {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();
    if(this.route.snapshot.queryParamMap.get("currency")){
      this.currency = this.route.snapshot.queryParamMap.get("currency")
    }    
    this.fetchBankAccounts();
    this.getPayinStatus();
    // this.loadPortals();
    this.initAddUpiForm();
    // this.portalService.selectedPortals$.subscribe((sites) => {
    //   this.selectedPortals = sites;
    //   // Mobile → grid by default
    //   // if (window.innerWidth < 800) {
    //   //   this.viewMode = 'grid';
    //   // }

    //   // Example → call API using selected portalIds
    //   const ids = sites.map((s) => s.portalId);
    // });

    this.searchSubject
      .pipe(debounceTime(600), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm = value;
        this.currentPage = 1;
        this.fetchBankAccounts();
      });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // ========== DATA FETCH (server‑side paginated) ==========
  fetchBankAccounts(): void {
    if (!this.currentRoleId) return;

    this.loading = true;

    const options: any = {
      page: this.currentPage - 1,
      size: this.pageSize,
      query: this.searchTerm.trim() || undefined,
      // minAmount: this.minAmount ?? undefined,
      // maxAmount: this.maxAmount ?? undefined,
      limit: this.maxLimit ?? undefined,
      portalId: this.selectedPortal?.portalId || undefined,
      status: this.statusFilter || undefined,
    };

    // if (this.filterStatus === "active") options.active = true;
    // if (this.filterStatus === "inactive") options.active = false;

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
}
else if (typeof r.status === "string" && r.status.trim() !== "") {
  status = r.status.toLowerCase() as StatusString;
}
else if (typeof r.active === "boolean") {
  status = r.active ? "active" : "inactive";
}

            // if (typeof r.status === "string" && r.status.trim() !== "") {
            //   status = r.status.toLowerCase() as StatusString;
            // } else if (typeof r.active === "boolean") {
            //   status = r.active ? "active" : "inactive";
            // } else if (typeof r.status === "boolean") {
            //   status = r.status ? "active" : "inactive";
            // }

            let accountType = r.accountType ?? "";
            if (accountType.toLowerCase() === "savings") {
              accountType = "saving";
            }

            // const isBankActive =
            //   typeof r.bank === "boolean"
            //     ? r.bank
            //     : typeof r.isBank === "boolean"
            //       ? r.isBank
            //       : typeof r.isBankActive === "boolean"
            //         ? r.isBankActive
            //         : typeof r.bankActive === "boolean"
            //           ? r.bankActive
            //           : status === "active";
const isBankActive = status === "active";
            return {
              id: r.id,
              branchId: r.branchId ?? null,
              portal: r.portalDomain ?? null,
              portalId: r.portal ?? null,
              portalDomain: r.portalDomain ?? null,
               allotStatus: r.allotStatus ?? false,
              accountHolderName: r.accountHolderName ?? r.name ?? "-",
              bankName: r.bankName ?? "",
              accountNo: r.accountNo ?? r.accountNumber ?? "",
              accountType,
              status,
              ifsc: r.ifsc ?? "",
              bankRange: r.bankRange ?? r.range ?? "",
              createdAt: r.createdAt ? new Date(r.createdAt) : null,
              limitAmount: r.limitAmount ?? "",
              currency: r.portalCurrency || "",
              limitTime: r.limitTime ?? null,
              min_tran_count: r.minTranCount ?? null,
              // max_tran_count: r.maxTranCount ?? null,
              min_total_tran_amount: r.minTotalTranAmount ?? null,
              // max_total_tran_amount: r.maxTotalTranAmount ?? null,
              // minAmount: r.minAmount ?? "",
              // maxAmount: r.maxAmount ?? "",
              isBankActive,
            } as BankAccount;
          })
          .sort((a, b) => {
            const aTime = a.limitTime ? new Date(a.limitTime).getTime() : 0;
            const bTime = b.limitTime ? new Date(b.limitTime).getTime() : 0;
            return bTime - aTime;
          });

        // Pagination info
        this.totalElements = res.totalElements ?? res.data?.totalElements ?? 0;
        this.totalPagesCount = res.totalPages ?? res.data?.totalPages ?? 0;
      });

    this.subs.add(sub);
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
    this.searchTerm = "";
    this.filterStatus = "";
    this.statusFilter = "";
    this.selectedPortal = null;
    this.portalSearchTerm = "";
    this.minAmount = null;
    this.maxAmount = null;
    this.maxLimit = null;
    this.showPortalDropdown = false;
    this.currentPage = 1;
    this.fetchBankAccounts();
  }

  // ========== PORTAL FILTER DROPDOWN ==========
  onPortalInputBlur(): void {
    setTimeout(() => (this.showPortalDropdown = false), 200);
  }

  filterPortals(): void {
    const term = this.portalSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredPortals = [...this.portals];
      this.showPortalDropdown = this.portals.length > 0;
      return;
    }
    this.filteredPortals = this.portals.filter(
      (site) =>
        site.portalDomain.toLowerCase().includes(term) ||
        (site.currency && site.currency.toLowerCase().includes(term)),
    );
    this.showPortalDropdown = this.filteredPortals.length > 0;
  }

  openPortalDropdown(): void {
    if (this.portals.length > 0) {
      this.filteredPortals = [...this.portals];
      this.showPortalDropdown = true;
    }
  }

  selectPortal(portal: Portal): void {
    this.selectedPortal = portal;
    this.portalSearchTerm = portal.portalDomain;
    this.showPortalDropdown = false;
    this.onFilterChange();
  }

  clearPortalFilter(): void {
    this.selectedPortal = null;
    this.portalSearchTerm = "";
    this.filteredPortals = [...this.portals];
    this.showPortalDropdown = false;
    this.onFilterChange();
  }

  // ========== PAGINATION ==========
  totalPages(): number {
    return this.totalPagesCount;
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage;

    const pages: number[] = [];

    const start = Math.max(1, current - 1);
    const end = Math.min(total, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
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
        ifscCode: [
          "",
          [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)],
        ],
        accountType: ["", Validators.required],
        limitAmount: [
          "",
          [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
        ],
        min_tran_count: [null],
        // max_tran_count: [null],
        min_total_tran_amount: [null],
        // max_total_tran_amount: [null],
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

  // ========== MODAL PORTAL LOADING ==========
  // loadPortals() {
  //   if (this.currentRoleId) {
  //     const sub = this.headService
  //       .getAllHeadsWithPortalsById(this.currentRoleId, "BANK")
  //       .subscribe({
  //         next: (res: any) => {
  //           this.portals = Array.isArray(res) ? res : [];
  //           this.modalFilteredPortals = [...this.portals];
  //         },
  //         error: (err) => {
  //           this.portals = [];
  //           this.modalFilteredPortals = [];
  //         },
  //       });
  //     this.subs.add(sub);
  //   }
  // }

  // ========== MODAL PORTAL SEARCH ==========
  // onModalPortalSearch() {
  //   const term = this.modalPortalSearch.toLowerCase();
  //   if (term) {
  //     this.modalFilteredPortals = this.portals.filter(
  //       (w) =>
  //         w.portalDomain.toLowerCase().includes(term) ||
  //         (w.currency && w.currency.toLowerCase().includes(term)),
  //     );
  //   } else {
  //     this.modalFilteredPortals = [...this.portals];
  //   }
  // }

  // selectPortalForForm(portal: Portal) {
  //   this.selectedModalPortal = portal;
  //   this.showModalPortalDropdown = false;
  //   this.modalPortalSearch = "";
  //   this.modalFilteredPortals = [...this.portals];
  //   this.addBankForm.patchValue({ portal: portal.portalId });
  //   this.addBankForm.get("portal")?.markAsTouched();
  // }

  // clearPortalSelection() {
  //   this.selectedModalPortal = null;
  //   this.addBankForm.patchValue({ portal: "" });
  //   this.addBankForm.get("portal")?.markAsTouched();
  // }

  onModalPortalSearch(): void {
    const term = this.modalPortalSearch.trim().toLowerCase();

    if (!term) {
      this.modalFilteredPortals = [...this.portals];
      return;
    }

    this.modalFilteredPortals = this.portals.filter(
      (w) =>
        w.portalDomain.toLowerCase().includes(term) ||
        (w.currency && w.currency.toLowerCase().includes(term)),
    );
  }

  // Update selectPortalForForm method
  selectPortalForForm(portal: Portal): void {
    this.selectedModalPortal = portal;
    this.showModalPortalDropdown = false;

    // Show the selected portal name in the input
    this.modalPortalSearch = portal.portalDomain;

    // Update form value
    this.addBankForm.patchValue({ portal: portal.portalId });
    this.addBankForm.get("portal")?.markAsTouched();

    // Reset filtered list
    this.modalFilteredPortals = [...this.portals];
  }

  // Update clearPortalSelection method
  clearPortalSelection(): void {
    this.selectedModalPortal = null;
    this.modalPortalSearch = "";
    this.modalFilteredPortals = [...this.portals];

    // Clear form value
    this.addBankForm.patchValue({ portal: "" });
    this.addBankForm.get("portal")?.markAsTouched();
    this.addBankForm.get("portal")?.updateValueAndValidity();

    // Reopen dropdown if needed
    if (this.portals.length > 0) {
      this.showModalPortalDropdown = true;
    }
  }

  // Add this new method for focus event
  onModalPortalFocus(): void {
    if (this.portals.length > 0 && !this.showModalPortalDropdown) {
      this.showModalPortalDropdown = true;
      this.onModalPortalSearch(); // refresh filtered list
    }
  }
  // ========== MODAL OPEN/CLOSE ==========
  // openAddBankModal() {
  //   this.showAddModal = true;
  //   this.loadPortals();
  //   this.modalPortalSearch = "";
  //   this.modalFilteredPortals = [];
  //   this.selectedModalPortal = null;
  //   this.showModalPortalDropdown = false;
  //   this.addBankForm.reset();
  //   this.addBankForm.markAsUntouched();
  //   document.body.style.overflow = "hidden";
  // }

  // closeAddBankModal() {
  //   this.showAddModal = false;
  //   this.addBankForm.reset();
  //   this.isAdding = false;
  //   this.modalPortalSearch = "";
  //   this.modalFilteredPortals = [];
  //   this.selectedModalPortal = null;
  //   this.showModalPortalDropdown = false;
  //   this.bankSearchTerm = ""; // Add this line
  //   this.filteredBanks = INDIAN_BANKS; // Add this line
  //   this.isCustomBank = false; // Add this line
  //   document.body.style.overflow = "auto";
  // }

  // Update openAddBankModal method
  openAddBankModal(): void {
    this.showAddModal = true;
    // this.loadPortals();

    // Reset all portal selection state
    this.selectedModalPortal = null;
    this.modalPortalSearch = "";
    this.modalFilteredPortals = [...this.portals];
    this.showModalPortalDropdown = false; // Don't open dropdown automatically

    this.addBankForm.reset({
      portal: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
      ifscCode: "",
      accountType: "",
      limitAmount: "",
    });
    this.addBankForm.markAsUntouched();
    this.bankSearchTerm = "";
    this.filteredBanks = INDIAN_BANKS;
    this.isCustomBank = false;
    this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];

    document.body.style.overflow = "hidden";
  }

  // Update closeAddBankModal method
  closeAddBankModal(): void {
    this.showAddModal = false;
    this.addBankForm.reset({
      portal: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
      ifscCode: "",
      accountType: "",
      limitAmount: "",
    });
    this.isAdding = false;

    // Reset portal selection state
    this.selectedModalPortal = null;
    this.modalPortalSearch = "";
    this.modalFilteredPortals = [];
    this.showModalPortalDropdown = false;

    // Reset bank dropdown state
    this.bankSearchTerm = "";
    this.filteredBanks = INDIAN_BANKS;
    this.isCustomBank = false;

    document.body.style.overflow = "auto";
  }

  openUpdateModal(account: BankAccount) {
    this.editingAccount = account;
    this.updateForm = {
      accountNo: account.accountNo || "",
      accountHolderName: account.accountHolderName || "",
      ifsc: account.ifsc || "",
      bankName: account.bankName || "",
      limitAmount: account.limitAmount || "",
      accountType: account.accountType || "saving",
      // status: account.status || "active",
      status: account.status === 'active',
      min_tran_count: account.min_tran_count || null,
      // max_tran_count: account.max_tran_count || null,
      min_total_tran_amount: account.min_total_tran_amount || null,
      // max_total_tran_amount: account.max_total_tran_amount || null,
      // minAmount: account.minAmount,
      // maxAmount: account.maxAmount,
    };
    this.showUpdateModal = true;
    this.activeActionDropdown = null;
    document.body.style.overflow = "hidden";
  }

  closeUpdateModal() {
    this.showUpdateModal = false;
    this.editingAccount = null;
    this.updateForm = {
      accountNo: "",
      accountHolderName: "",
      ifsc: "",
      bankName: "",
      limitAmount: "",
      accountType: "saving",
      status: "active",
      min_tran_count: null,
      // max_tran_count: null,
      min_total_tran_amount: null,
      // max_total_tran_amount: null,
      // minAmount: "",
      // maxAmount: "",
    };
    this.isSubmitting = false;
    document.body.style.overflow = "auto";
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

  // ========== STATUS UPDATE ==========
  updateAccountStatus(accountId: string, status: string, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const account = this.bankAccounts.find((acc) => acc.id === accountId);
    if (!account) return;

    this.isUpdatingStatus[accountId] = true;

    const payload = {
      id: accountId,
      portal: account.portalId || account.portal,
      entityId: this.currentRoleId,
      entityType: this.role,
      accountNo: account.accountNo,
      accountHolderName: account.accountHolderName,
      ifsc: account.ifsc,
      limitAmount: account.limitAmount,
      accountType: account.accountType,
      status: status,
      // minAmount: account.minAmount,
      // maxAmount: account.maxAmount,
    };

    const sub = this.bankService.update(payload).subscribe({
      next: (res) => {
        account.status = status;
        this.isUpdatingStatus[accountId] = false;
        this.activeActionDropdown = null;
        this.fetchBankAccounts();

        this.snack.show(
          res.message || `Account status updated to ${status}`,
          true,
        );
      },
      error: (err) => {
        this.isUpdatingStatus[accountId] = false;
        // alert("Error updating account status. Please try again.");
        this.snack.show(
          err?.error?.message ||
            "Error updating account status. Please try again.",
          false,
        );
      },
    });
    this.subs.add(sub);
  }

  // ========== FORM SUBMISSION ==========

  submitAddBankForm() {
    Object.keys(this.addBankForm.controls).forEach((key) =>
      this.addBankForm.get(key)?.markAsTouched(),
    );

    if (this.addBankForm.invalid) {
      this.snack.show("Please fill in all required fields correctly.", false);
      return;
    }

    const invalid = this.capacityRanges.some(
      (r) =>
        r.minRange === null ||
        r.maxRange === null ||
        r.quantity === null ||
        Number(r.maxRange) <= Number(r.minRange),
    );

    if (invalid) {
      this.snack.show("Max range should be greater than min range", false);
      return;
    }

    this.isAdding = true;

    const formData = this.addBankForm.value;
    const payload = {
      entityId: this.currentRoleId,
      entityType: this.role,
      portal: formData.portal,
      currency: this.currency,
      bankName: formData.bankName, 
      accountNo: formData.accountNumber,
      accountHolderName: formData.accountHolderName,
      ifsc: formData.ifscCode,
      accountType: formData.accountType,
      limitAmount: formData.limitAmount,
      status: true,
      minTranCount: Number(formData.min_tran_count) || 0,
      // maxTranCount: Number(formData.max_tran_count) || 0,
      minTotalTranAmount: Number(formData.min_total_tran_amount) || 0,
      // maxTotalTranAmount: Number(formData.max_total_tran_amount) || 0,
      // ranges stays same
      ranges: this.capacityRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      })),
    };

    const sub = this.bankService.addBank(payload).subscribe({
      next: (res) => {
        this.isAdding = false;
        this.closeAddBankModal();
        this.fetchBankAccounts();
        this.snack.show(
          res.message || "Bank account added successfully!",
          true,
        );
      },
      error: (err) => {
        this.isAdding = false;
        this.snack.show(
          err?.error?.message || "Error adding bank account. Please try again.",
          false,
        );
      },
    });
    this.subs.add(sub);
  }

  submitUpdate() {
    if (!this.editingAccount) return;

    if (!this.updateForm.accountNo.trim()) {
      // alert("Account Number is required");
      this.snack.show("Account Number is required", false);
      return;
    }
    if (!this.updateForm.accountHolderName.trim()) {
      // alert("Account Holder Name is required");
      this.snack.show("Account Holder Name is required", false);

      return;
    }
    if (!this.updateForm.ifsc.trim()) {
      // alert("IFSC Code is required");
      this.snack.show("IFSC Code is required", false);

      return;
    }
    if (!this.updateForm.limitAmount || this.updateForm.limitAmount <= 0) {
      // alert("Please enter a valid limit amount");
      this.snack.show("Please enter a valid limit amount", false);

      return;
    }

    this.isSubmitting = true;

    const payload = {
      id: this.editingAccount.id,
      portal: this.editingAccount.portalId,
      entityId: this.currentRoleId,
      entityType: this.role,
      accountNo: this.updateForm.accountNo,
      accountHolderName: this.updateForm.accountHolderName,
      bankName: this.updateForm.bankName,
      ifsc: this.updateForm.ifsc,
      limitAmount: this.updateForm.limitAmount,
      accountType: this.updateForm.accountType,
     status: this.updateForm.status,
      minTranCount: Number(this.updateForm.min_tran_count) || 0,
      // maxTranCount: Number(this.updateForm.max_tran_count) || 0,
      minTotalTranAmount: Number(this.updateForm.min_total_tran_amount) || 0,
      // maxTotalTranAmount: Number(this.updateForm.max_total_tran_amount) || 0,
      // minAmount: this.updateForm.minAmount,
      // maxAmount: this.updateForm.maxAmount,
    };

    const sub = this.bankService.update(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.fetchBankAccounts();
        this.snack.show(
          res.message || "Bank account updated successfully!",
          true,
        );
      },
      error: (err) => {
        this.isSubmitting = false;
       
        this.snack.show(
          err?.error?.message ||
            "Error updating bank account. Please try again.",
          false,
        );
      },
    });
    this.subs.add(sub);
  }

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

  // handleOutsideClick(event: MouseEvent) {
  //   const target = event.target as HTMLElement;

  //   // Close FILTER portal dropdown
  //   if (
  //     this.showPortalDropdown &&
  //     !target.closest(".portal-filter-container")
  //   ) {
  //     this.showPortalDropdown = false;
  //   }

  //   // Close ADD MODAL portal dropdown
  //   if (
  //     this.showModalPortalDropdown &&
  //     !target.closest(".modal-portal-container")
  //   ) {
  //     this.showModalPortalDropdown = false;
  //   }
  // }

  toggleBankStatus(bankId: string) {
    this.bankService.toogleBankDeleted(bankId).subscribe({
      next: (res) => {
        // Success: refresh the list to reflect the updated status
        this.fetchBankAccounts();
        // Optional: show success message
        // this.showUpdateSuccess('Bank status toggled successfully!');
      },
      error: (err) => {
        // Optional: show error message to user
        // alert('Failed to toggle status. Please try again.');
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

  // ========== UPDATE MODAL BANK DROPDOWN METHODS ==========
  onUpdateBankInputFocus(): void {
    this.updateShowBankDropdown = true;
    this.updateFilteredBanks = INDIAN_BANKS;
  }

  onUpdateBankInputBlur(): void {
    setTimeout(() => {
      this.updateShowBankDropdown = false;
    }, 200);
  }

  onUpdateBankInputChange(): void {
    const value = this.updateForm.bankName || "";
    this.updateBankSearchTerm = value;

    const term = value.toLowerCase().trim();
    this.updateFilteredBanks = INDIAN_BANKS.filter((bank) =>
      bank.toLowerCase().includes(term),
    );

    this.updateIsCustomBank =
      value.trim() !== "" &&
      !INDIAN_BANKS.some((bank) => bank.toLowerCase() === value.toLowerCase());
  }

  selectUpdateBank(bank: string): void {
    this.updateForm.bankName = bank;
    this.updateShowBankDropdown = false;
    this.updateIsCustomBank = false;
    // Trigger change detection if needed (Angular handles it with ngModel)
  }

  selectUpdateCustomBank(): void {
    const customName = this.updateBankSearchTerm.trim();
    if (!customName) return;

    this.updateForm.bankName = customName;
    this.updateIsCustomBank = true;
    this.updateShowBankDropdown = false;
  }

  clearUpdateBankSelection(): void {
    this.updateForm.bankName = "";
    this.updateFilteredBanks = INDIAN_BANKS;
    this.updateIsCustomBank = false;
  }

  // openModalPortalDropdown(event: MouseEvent) {
  //   event.stopPropagation();

  //   this.showModalPortalDropdown = true;

  //   if (!this.modalPortalSearch) {
  //     this.modalFilteredPortals = [...this.portals];
  //   }
  // }

  openModalPortalDropdown(event: MouseEvent): void {
    event.stopPropagation();
    // Only open dropdown if we have portals
    if (this.portals.length > 0) {
      this.showModalPortalDropdown = true;
      this.onModalPortalSearch(); // refresh filtered list
    }
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

    if (!target.closest(".portal-filter-container")) {
      this.showPortalDropdown = false;
    }

    if (!target.closest(".modal-portal-container")) {
      this.showModalPortalDropdown = false;
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

    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    this.limitDateTime = local;
    this.minLimitDateTime = local;
  }

  //   submitLimitTime() {
  //   if (!this.limitDateTime || !this.editingAccount) return;

  //   const selectedTime = new Date(this.limitDateTime).getTime();
  //   const nowTime = new Date().getTime();

  //   if (selectedTime < nowTime) {
  //     this.snack.show("Please select a future date and time", false);
  //     return;
  //   }

  //   this.isSubmittingLimit = true;

  //   const payload = {
  //     dateTime: this.limitDateTime,
  //   };

  //   const id = this.editingAccount.id;

  //   this.bankService.setLimitTime(id, payload).subscribe({
  //     next: () => {
  //       this.snack.show("Limit time set successfully", true);
  //       this.closeLimitModal();
  //       this.isSubmittingLimit = false;
  //     },
  //     error: () => {
  //       this.snack.show("Failed to set limit time", false);
  //       this.isSubmittingLimit = false;
  //     },
  //   });

  // }

  submitLimitTime() {
    if (!this.limitDateTime || !this.editingAccount) return;

    const selectedTime = new Date(this.limitDateTime).getTime();
    const nowTime = new Date().getTime();

    if (selectedTime < nowTime) {
      this.snack.show("Please select a future date and time", false);
      return;
    }

    this.isSubmittingLimit = true;

    const payload = {
      dateTime: this.limitDateTime,
    };

    const id = this.editingAccount.id;

    this.bankService.setLimitTime(id, payload).subscribe({
      next: (res) => {
        this.snack.show("Limit time set successfully", true);
        this.closeLimitModal();
        this.isSubmittingLimit = false;

        //  reload table/grid data
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

  addRange() {
    const last = this.capacityRanges[this.capacityRanges.length - 1];

    // if (
    //   last.maxRange === null ||
    //   last.maxRange === undefined ||
    //   last.quantity === null
    // )
    if (
      last.minRange === null ||
      last.maxRange === null ||
      last.quantity === null
    ) {
      this.snack.show("Please fill 'To' and Quantity first", false);
      return;
    }

    //  MAIN VALIDATION HERE ONLY
    if (last.maxRange <= (last.minRange ?? 0)) {
      this.snack.show("'To' must be greater than 'From'", false);
      return;
    }

    // this.capacityRanges.push({
    //   minRange: last.maxRange,
    //   maxRange: null,
    //   quantity: null,
    // });
    this.capacityRanges.push({
      minRange: null,
      maxRange: null,
      quantity: null,
    });
  }

  removeRange(index: number) {
    this.capacityRanges.splice(index, 1);

    // this.recalculateRanges();
  }

  recalculateRanges() {
    // for (let i = 1; i < this.capacityRanges.length; i++) {
    //   const prev = this.capacityRanges[i - 1];
    //   const current = this.capacityRanges[i];
    //   current.minRange = prev.maxRange;
    // }
  }

  // onRangeChange(index: number) {
  //   const current = this.capacityRanges[index];

  //   current.maxRange =
  //     current.maxRange !== null ? Number(current.maxRange) : null;
  //   current.minRange =
  //     current.minRange !== null ? Number(current.minRange) : null;

  //   if (
  //     current.maxRange &&
  //     current.minRange &&
  //     current.maxRange <= current.minRange
  //   ) {
  //     current.maxRange = null;
  //     return;
  //   }

  //   if (this.capacityRanges[index + 1]) {
  //     this.capacityRanges[index + 1].minRange = current.maxRange;
  //   }
  // }

  updateFrom(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].minRange = isNaN(value) ? null : value;
  }

  updateTo(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].maxRange = isNaN(value) ? null : value;

    // this.recalculateRanges();
  }

  updateQuantity(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].quantity = isNaN(value) ? null : value;
  }

  openCapacityModal(account: any) {
    this.editingAccount = account;
    console.log(account);

    this.isEditingCapacity = false;
    this.showCapacityModal = true;
    this.isLoadingCapacity = true;

    this.capacityRanges = [];

    this.bankService
      .getPayinCapacity(
        this.role,
        this.currentRoleId,
        // account.portalId,
        "BANK",
        account.id,
      )
      .subscribe({
        next: (res: any) => {
          this.isLoadingCapacity = false;
          const res2 = res?.data;
          this.capacityData = Array.isArray(res2) ? res2 : [];

          //  FIX: map to UI array
          this.capacityRanges = this.capacityData.map((r: any) => ({
            minRange: r.minRange,
            maxRange: r.maxRange,
            quantity: r.quantity,
          }));
        },
        error: () => {
          this.isLoadingCapacity = false;
          this.snack.show("Failed to fetch capacity", false);
        },
      });
  }

  closeCapacityModal() {
    this.showCapacityModal = false;
    this.capacityData = [];
  }

  saveCapacity(account: any) {
    const invalid = this.capacityRanges.some(
      (r) =>
        r.minRange === null ||
        r.maxRange === null ||
        r.quantity === null ||
        r.maxRange <= r.minRange,
    );

    if (invalid) {
      this.snack.show("Please enter valid capacity ranges", false);
      return;
    }

    const payload = {
      entityType: this.role,
      entityId: this.currentRoleId,
      portalId: account.portalId,
      mode: "BANK",
      payinId: account.id,

      //  IMPORTANT
      ranges: this.capacityRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      })),
    };

    this.bankService.addPayinCapacity(payload).subscribe({
      next: () => {
        this.snack.show("Capacity saved successfully", true);
        this.closeCapacityModal();

        //  refresh view
        this.openCapacityModal(account);
      },
      error: () => {
        this.snack.show("Failed to save capacity", false);
      },
    });
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

  // Execute toggle after OK
  // executeBankToggle() {
  //   if (!this.toggleCandidateBank) return;

  //   const bank = this.toggleCandidateBank;

  //   this.bankService.toggleIsBank(bank.id).subscribe({
  //     next: (res: any) => {
  //       // Toggle UI only after backend success
  //       bank.isBankActive = !bank.isBankActive;

  //       this.closeBankToggleConfirm();
  //     },
  //     error: (err) => {

  //       this.closeBankToggleConfirm();
  //     },
  //   });
  // }
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

    this.addBankForm.get("ifscCode")?.setValue(formattedValue, {
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

  showTooltip(event: MouseEvent, account: any) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();

    this.tooltipX = rect.left + rect.width / 2 - 120; // center align
    this.tooltipY = rect.top - 10; // above element

    this.tooltipData = account;
    this.tooltipVisible = true;
  }

  hideTooltip() {
    this.tooltipVisible = false;
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
        });
    } else if (this.role === "BRANCH") {
      this.branchService
        .toggleDashbaordPayin(this.currentRoleId)
        .subscribe(() => {
          this.payinStatus = !this.payinStatus;
        });
    }
  }

  viewUpi(account: any) {
    if (!account?.id) return;

    if (this.role === "HEAD") {
      this.router.navigate(["/head/payments-methods/upi"], {
        queryParams: { bankId: account.id },
      });
    } else if (this.role === "BRANCH") {
      this.router.navigate(["/branch/payments-methods/upi"], {
        queryParams: { bankId: account.id },
      });
    }
  }
  showAddUpiModal = false;
  isAddingUpi = false;

  addUpiForm!: FormGroup;
  selectedBank: any = null;

  // initAddUpiForm() {
  //   this.addUpiForm = this.fb.group({
  //     vpa: ["", [Validators.required]],
  //     limitAmount: ["", Validators.required],
  //     min_tran_count: [null],
  //     max_tran_count: [null],
  //     min_total_tran_amount: [null],
  //     max_total_tran_amount: [null],
  //   });
  // }

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

      min_tran_count: [null],
      // max_tran_count: [null],
      min_total_tran_amount: [null],
      // max_total_tran_amount: [null],
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
    const validRanges = this.capacityRanges || [];

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

      // minTranCount: Number(this.addUpiForm.value.min_tran_count) || 0,
      // maxTranCount: Number(this.addUpiForm.value.max_tran_count) || 0,
      // minTotalTranAmount:
      //   Number(this.addUpiForm.value.min_total_tran_amount) || 0,
      // maxTotalTranAmount:
      //   Number(this.addUpiForm.value.max_total_tran_amount) || 0,

      createdAt: new Date().toISOString(),

      ranges: this.capacityRanges.map((r) => ({
        minRange: r.minRange ?? null,
        maxRange: r.maxRange ?? null,
        quantity: r.quantity ?? null,
      })),
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

  onToggleStatus(account: any, event: any) {
  const newStatus = event.target.checked; // true / false
const bankID =account.id;
  const payload = {
    id: account.id,
    portal: account.portalId || account.portal,
    entityId: this.currentRoleId,
    entityType: this.role,
    accountNo: account.accountNo,
    accountHolderName: account.accountHolderName,
    ifsc: account.ifsc,
    limitAmount: account.limitAmount,
    accountType: account.accountType,
    status: newStatus 
  };

  this.bankService.toggleIsBank(bankID).subscribe({
    next: (res) => {
      // update UI instantly
      account.status = newStatus ? 'active' : 'inactive';

      this.snack.show(res.message||"Status updated", true);
    },
    error: () => {
      // revert toggle if failed
      event.target.checked = !newStatus;
      this.snack.show("Failed to update status", false);
    }
  });
}
}
