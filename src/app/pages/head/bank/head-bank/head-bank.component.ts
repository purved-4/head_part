import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subscription, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { BankService } from "../../../services/bank.service";
import { UserStateService } from "../../../../store/user-state.service";
import { HeadService } from "../../../services/head.service";
import { ViewChild, ElementRef } from "@angular/core";
// import {
 
//   PortalInfo,
// } from "../../../services/portal-sharing.service";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { INDIAN_BANKS } from "../../../../utils/constants";

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
  bankName?: string;
  limitTime?: string | null;
  isBankActive?: boolean;
  currency?: string;
}

interface Portal {
  portalId: string;
  portalDomain: string;
  currency: string;
  // portal:string;
}

@Component({
  selector: "app-head-bank",
  templateUrl: "./head-bank.component.html",
  styleUrls: ["./head-bank.component.css"],
})
export class HeadBankComponent implements OnInit, OnDestroy {
  @ViewChild("portalDropdown") portalDropdown!: ElementRef;
  // ---------- DATA (server‑paginated) ----------
  bankAccounts: BankAccount[] = [];
  totalElements = 0;
  totalPagesCount = 0;
  loading = false;

  showPaymentDropdown = false;
  selectedMethod = "bank";
  statusFilter: string = "all";
  minLimitDateTime: string = "";

  // ---------- FILTERS (sent to backend) ----------
  searchTerm = ""; // unified search (accountNo, holder, IFSC, portal)
  filterStatus = ""; // 'active', 'inactive', '' (empty = all)
  selectedPortal: Portal | null = null;
  minAmount: number | null = null;
  maxAmount: number | null = null;
  maxLimit: number | null = null; // max limit filter

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
    status: "active",
    minAmount: "",
    maxAmount: "",
    bankName: "",
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

  selectedPortals:  [] = [];

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
  constructor(
    private route: ActivatedRoute,
    private bankService: BankService,
    private fb: FormBuilder,
    private userStateService: UserStateService,
    private headService: HeadService,
    // private portalService: PortalSharingService,
    private snack: SnackbarService,
    private router: Router,
    private elementRef: ElementRef,
  ) {
    this.addBankForm = this.createAddBankForm();
  }

  ngOnInit() {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.fetchBankAccounts();
    this.loadPortals();
   

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
          console.error("Error fetching bank accounts", err);
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

            if (typeof r.status === "string" && r.status.trim() !== "") {
              status = r.status.toLowerCase() as StatusString;
            } else if (typeof r.active === "boolean") {
              status = r.active ? "active" : "inactive";
            } else if (typeof r.status === "boolean") {
              status = r.status ? "active" : "inactive";
            }

            let accountType = r.accountType ?? "";
            if (accountType.toLowerCase() === "savings") {
              accountType = "saving";
            }

            const isBankActive =
              typeof r.bank === "boolean"
                ? r.bank
                : typeof r.isBank === "boolean"
                  ? r.isBank
                  : typeof r.isBankActive === "boolean"
                    ? r.isBankActive
                    : typeof r.bankActive === "boolean"
                      ? r.bankActive
                      : status === "active";

            return {
              id: r.id,
              branchId: r.branchId ?? null,
              portal: r.portalDomain ?? null,
              portalId: r.portal ?? null,
              portalDomain: r.portalDomain ?? null,
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
        portal: ["", Validators.required],
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
  loadPortals() {
    if (this.currentRoleId) {
      const sub = this.headService
        .getAllHeadsWithPortalsById(this.currentRoleId, "BANK")
        .subscribe({
          next: (res: any) => {
            this.portals = Array.isArray(res) ? res : [];
            this.modalFilteredPortals = [...this.portals];
          },
          error: (err) => {
            console.error("Error loading portals", err);
            this.portals = [];
            this.modalFilteredPortals = [];
          },
        });
      this.subs.add(sub);
    }
  }

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
    this.loadPortals();

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
      status: account.status || "active",
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
      next: () => {
        account.status = status;
        this.isUpdatingStatus[accountId] = false;
        this.activeActionDropdown = null;
        this.fetchBankAccounts();
        // alert(`Account status updated to ${status}`);
        this.snack.show(`Account status updated to ${status}`, true);
      },
      error: (err) => {
        console.error("Error updating account status:", err);
        this.isUpdatingStatus[accountId] = false;
        // alert("Error updating account status. Please try again.");
        this.snack.show(
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
        r.maxRange <= r.minRange,
    );

    if (invalid) {
      this.snack.show("Please enter valid capacity ranges", false);
      return;
    }

    this.isAdding = true;

    const formData = this.addBankForm.value;
    const payload = {
      entityId: this.currentRoleId,
      entityType: this.role,
      portal: formData.portal,
      bankName: formData.bankName, // This will now include both selected and custom bank names
      accountNo: formData.accountNumber,
      accountHolderName: formData.accountHolderName,
      ifsc: formData.ifscCode,
      accountType: formData.accountType,
      limitAmount: formData.limitAmount,
      status: "active",

      // ranges stays same
      ranges: this.capacityRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      })),
    };

    const sub = this.bankService.addBank(payload).subscribe({
      next: () => {
        this.isAdding = false;
        this.closeAddBankModal();
        this.fetchBankAccounts();
        this.snack.show("Bank account added successfully!", true);
      },
      error: (err) => {
        console.error("Error adding bank account:", err);
        this.isAdding = false;
        this.snack.show("Error adding bank account. Please try again.", false);
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
      // minAmount: this.updateForm.minAmount,
      // maxAmount: this.updateForm.maxAmount,
    };

    const sub = this.bankService.update(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.fetchBankAccounts();
        this.snack.show("Bank account updated successfully!", true);
      },
      error: (err) => {
        console.error("Error updating bank account:", err);
        this.isSubmitting = false;
        alert("Error updating bank account. Please try again.");
        this.snack.show(
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
    this.bankService.toogleBankStatus(bankId).subscribe({
      next: (res) => {
        // Success: refresh the list to reflect the updated status
        this.fetchBankAccounts();
        // Optional: show success message
        // this.showUpdateSuccess('Bank status toggled successfully!');
      },
      error: (err) => {
        console.error("Error toggling bank status:", err);
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

  //   console.log("SENDING ID 👉", id);

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

    console.log("SENDING ID 👉", id);

    this.bankService.setLimitTime(id, payload).subscribe({
      next: () => {
        this.snack.show("Limit time set successfully", true);
        this.closeLimitModal();
        this.isSubmittingLimit = false;

        // 🔥 reload table/grid data
        this.fetchBankAccounts();
      },
      error: () => {
        this.snack.show("Failed to set limit time", false);
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

    if (
      last.maxRange === null ||
      last.maxRange === undefined ||
      last.quantity === null
    ) {
      this.snack.show("Please fill 'To' and Quantity first", false);
      return;
    }

    // 🔥 MAIN VALIDATION HERE ONLY
    if (last.maxRange <= (last.minRange ?? 0)) {
      this.snack.show("'To' must be greater than 'From'", false);
      return;
    }

    this.capacityRanges.push({
      minRange: last.maxRange,
      maxRange: null,
      quantity: null,
    });
  }

  removeRange(index: number) {
    this.capacityRanges.splice(index, 1);

    // 🔥 FIX: re-chain all ranges
    this.recalculateRanges();
  }

  recalculateRanges() {
    for (let i = 1; i < this.capacityRanges.length; i++) {
      const prev = this.capacityRanges[i - 1];
      const current = this.capacityRanges[i];

      current.minRange = prev.maxRange;
    }
  }

  onRangeChange(index: number) {
    const current = this.capacityRanges[index];

    // 🔥 FORCE NUMBER
    current.maxRange =
      current.maxRange !== null ? Number(current.maxRange) : null;
    current.minRange =
      current.minRange !== null ? Number(current.minRange) : null;

    if (
      current.maxRange &&
      current.minRange &&
      current.maxRange <= current.minRange
    ) {
      current.maxRange = null;
      return;
    }

    if (this.capacityRanges[index + 1]) {
      this.capacityRanges[index + 1].minRange = current.maxRange;
    }
  }

  updateFrom(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].minRange = isNaN(value) ? null : value;
  }

  updateTo(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].maxRange = isNaN(value) ? null : value;

    // 🔥 always re-chain after change
    this.recalculateRanges();
  }

  updateQuantity(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].quantity = isNaN(value) ? null : value;
  }

  openCapacityModal(account: any) {
    this.editingAccount = account;
    this.isEditingCapacity = false;
    this.showCapacityModal = true;
    this.isLoadingCapacity = true;

    this.capacityRanges = [];

    this.bankService
      .getTopupCapacity(
        "HEAD",
        this.currentRoleId,
        account.portalId,
        "BANK",
        account.id,
      )
      .subscribe({
        next: (res: any) => {
          this.isLoadingCapacity = false;
          const res2 = res?.data;
          this.capacityData = Array.isArray(res2) ? res2 : [];

          // 🔥 FIX: map to UI array
          this.capacityRanges = this.capacityData.map((r: any) => ({
            minRange: r.minRange,
            maxRange: r.maxRange,
            quantity: r.quantity,
          }));

          console.log("CAPACITY 👉", this.capacityRanges);
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
      entityType: "HEAD",
      entityId: this.currentRoleId,
      portalId: account.portalId,
      mode: "BANK",
      topupId: account.id,

      // 🔥 IMPORTANT
      ranges: this.capacityRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      })),
    };

    console.log("PAYLOAD 👉", payload);

    this.bankService.addTopupCapacity(payload).subscribe({
      next: () => {
        this.snack.show("Capacity saved successfully", true);
        this.closeCapacityModal();

        // 🔥 refresh view
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
  selectedTopupId!: string;
  selectedMode!: "UPI" | "BANK";

  openCapacity(item: any, mode: "UPI" | "BANK") {
    console.log("🔥 CLICK ITEM:", item);

    this.selectedId = item.id;

    this.selectedPortalId = item.portalId || item.portal || item.portalID;

    this.selectedTopupId = item.topupId || item.id || item.qrId;

    this.selectedMode = mode;

    console.log("🔥 FINAL PASS:", {
      entityId: this.selectedId,
      portalId: this.selectedPortalId,
      topupId: this.selectedTopupId,
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
  //       console.error("Bank toggle failed", err);
  //       this.closeBankToggleConfirm();
  //     },
  //   });
  // }
  executeBankToggle() {
    if (!this.toggleCandidateBank) return;

    const bank = this.toggleCandidateBank;

    this.bankService.toggleIsBank(bank.id).subscribe({
      next: (res: any) => {
        console.log("TOGGLE RESPONSE =>", res);
        this.closeBankToggleConfirm();
        this.fetchBankAccounts();
        this.snack.show(res?.message || "Failed...", true);
      },
      error: (err) => {
        console.error("Bank toggle failed", err);
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
}
