import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subscription, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { BankService } from "../../../services/bank.service";
import { UserStateService } from "../../../../store/user-state.service";
import { HeadService } from "../../../services/head.service";

type StatusString = "active" | "inactive" | "frozen" | string;

interface BankAccount {
  id: string;
  branchId?: string | null;
  website?: string;
  websiteDomain?: string;
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
  websiteId?: string;
}

interface Website {
  websiteId: string;
  websiteDomain: string;
  currency: string;
}

@Component({
  selector: "app-head-bank",
  templateUrl: "./head-bank.component.html",
  styleUrls: ["./head-bank.component.css"],
})
export class HeadBankComponent implements OnInit, OnDestroy {
  // ---------- DATA (server‑paginated) ----------
  bankAccounts: BankAccount[] = [];
  totalElements = 0;
  totalPagesCount = 0;
  loading = false;

  // ---------- FILTERS (sent to backend) ----------
  searchTerm = ""; // unified search (accountNo, holder, IFSC, website)
  filterStatus = ""; // 'active', 'inactive', '' (empty = all)
  selectedWebsite: Website | null = null;
  minAmount: number | null = null;
  maxAmount: number | null = null;
  maxLimit: number | null = null; // max limit filter

  // UI state for website filter dropdown
  websiteSearchTerm = "";
  showWebsiteDropdown = false;
  filteredWebsites: Website[] = [];

  // UI toggle for amount filter section
  showAmountFilter = false;

  // ---------- PAGINATION ----------
  currentPage = 1;
  pageSize = 10;
  Math = Math;

  // ---------- ADD MODAL ----------
  showAddModal = false;
  isAdding = false;
  websites: Website[] = [];
  addBankForm: FormGroup;
  showDebug = false; // kept for debug, but you can remove

  // Modal website search
  modalWebsiteSearch = "";
  modalFilteredWebsites: Website[] = [];
  selectedModalWebsite: Website | null = null;
  showModalWebsiteDropdown = false;

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
  };
  isSubmitting = false;

  // ---------- USER / ROLE ----------
  currentRoleId: any;
  currentUserId: any;
  role: any;

  // ---------- ACTION DROPDOWN ----------
  activeActionDropdown: string | null = null;
  isUpdatingStatus: { [key: string]: boolean } = {};

  // ---------- SUCCESS TOASTS (for add/update) ----------
  showAddSuccessPopup = false;
  addSuccessMessage = "";
  showUpdateSuccessPopup = false;
  updateSuccessMessage = "";
  private successPopupTimeout: any;

  // ---------- SUBSCRIPTION MANAGEMENT ----------
  private subs = new Subscription();

  // ---------- COMPUTED: active filters count ----------
  get activeFilters(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.filterStatus) count++;
    if (this.selectedWebsite) count++;
    if (this.minAmount !== null || this.maxAmount !== null) count++;
    if (this.maxLimit !== null && this.maxLimit > 0) count++;
    return count;
  }

  constructor(
    private route: ActivatedRoute,
    private bankService: BankService,
    private fb: FormBuilder,
    private userStateService: UserStateService,
    private headService: HeadService,
  ) {
    this.addBankForm = this.createAddBankForm();
  }

  ngOnInit() {
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.fetchBankAccounts();

    document.addEventListener("click", this.handleOutsideClick.bind(this));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    document.removeEventListener("click", this.handleOutsideClick.bind(this));
    if (this.successPopupTimeout) clearTimeout(this.successPopupTimeout);
  }

  // ========== DATA FETCH (server‑side paginated) ==========
  fetchBankAccounts(): void {
    if (!this.currentRoleId) return;

    this.loading = true;

    const options: any = {
      page: this.currentPage - 1,
      size: this.pageSize,
      query: this.searchTerm.trim() || undefined,
      minAmount: this.minAmount ?? undefined,
      maxAmount: this.maxAmount ?? undefined,
      limit: this.maxLimit ?? undefined,
      websiteId: this.selectedWebsite?.websiteId || undefined,
    };

    if (this.filterStatus === "active") options.active = true;
    if (this.filterStatus === "inactive") options.active = false;

    const sub = this.bankService
      .getBankDataWithSubAdminIdPaginated(this.currentRoleId, options)
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
        const rows = Array.isArray(res.data?.content)
          ? res.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];

        this.bankAccounts = rows.map((r: any) => {
          let status: StatusString = "inactive";
          if (typeof r.status === "string" && r.status.trim() !== "") {
            status = r.status.toLowerCase();
          } else if (typeof r.active === "boolean") {
            status = r.active ? "active" : "inactive";
          } else if (typeof r.status === "boolean") {
            status = r.status ? "active" : "inactive";
          }

          let accountType = r.accountType ?? "";
          if (accountType.toLowerCase() === "savings") {
            accountType = "saving";
          }

          return {
            id: r.id,
            branchId: r.branchId ?? null,
            website: r.websiteDomain ?? null,
            websiteId: r.website ?? null,
            websiteDomain: r.websiteDomain ?? null,
            accountHolderName: r.accountHolderName ?? r.name ?? "-",
            accountNo: r.accountNo ?? r.accountNumber ?? "",
            accountType: accountType,
            status,
            ifsc: r.ifsc ?? "",
            bankRange: r.bankRange ?? r.range ?? "",
            createdAt: r.createdAt
              ? new Date(r.createdAt)
              : (r.createdAt ?? null),
            limitAmount: r.limitAmount,
            minAmount: r.minAmount || "",
            maxAmount: r.maxAmount || "",
          } as BankAccount;
        });

        this.totalElements = res.totalElements || res.data?.totalElements || 0;
        this.totalPagesCount = res.totalPages || res.data?.totalPages || 0;
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
    this.selectedWebsite = null;
    this.websiteSearchTerm = "";
    this.minAmount = null;
    this.maxAmount = null;
    this.maxLimit = null;
    this.showWebsiteDropdown = false;
    this.currentPage = 1;
    this.fetchBankAccounts();
  }

  // ========== WEBSITE FILTER DROPDOWN ==========
  onWebsiteInputBlur(): void {
    setTimeout(() => (this.showWebsiteDropdown = false), 200);
  }

  filterWebsites(): void {
    const term = this.websiteSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredWebsites = [...this.websites];
      this.showWebsiteDropdown = this.websites.length > 0;
      return;
    }
    this.filteredWebsites = this.websites.filter(
      (site) =>
        site.websiteDomain.toLowerCase().includes(term) ||
        (site.currency && site.currency.toLowerCase().includes(term)),
    );
    this.showWebsiteDropdown = this.filteredWebsites.length > 0;
  }

  openWebsiteDropdown(): void {
    if (this.websites.length > 0) {
      this.filteredWebsites = [...this.websites];
      this.showWebsiteDropdown = true;
    }
  }

  selectWebsite(website: Website): void {
    this.selectedWebsite = website;
    this.websiteSearchTerm = website.websiteDomain;
    this.showWebsiteDropdown = false;
    this.onFilterChange();
  }

  clearWebsiteFilter(): void {
    this.selectedWebsite = null;
    this.websiteSearchTerm = "";
    this.filteredWebsites = [...this.websites];
    this.showWebsiteDropdown = false;
    this.onFilterChange();
  }

  // ========== PAGINATION ==========
  totalPages(): number {
    return this.totalPagesCount;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const total = this.totalPages();
    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
      } else if (this.currentPage >= total - 2) {
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++)
          pages.push(i);
      }
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

  // ========== TOAST METHODS (for add/update) ==========
  closeAddSuccessPopup(): void {
    if (this.successPopupTimeout) clearTimeout(this.successPopupTimeout);
    this.showAddSuccessPopup = false;
    this.addSuccessMessage = "";
  }

  closeUpdateSuccessPopup(): void {
    if (this.successPopupTimeout) clearTimeout(this.successPopupTimeout);
    this.showUpdateSuccessPopup = false;
    this.updateSuccessMessage = "";
  }

  private showAddSuccess(message: string): void {
    this.addSuccessMessage = message;
    this.showAddSuccessPopup = true;
    this.successPopupTimeout = setTimeout(() => {
      this.closeAddSuccessPopup();
    }, 3000);
  }

  private showUpdateSuccess(message: string): void {
    this.updateSuccessMessage = message;
    this.showUpdateSuccessPopup = true;
    this.successPopupTimeout = setTimeout(() => {
      this.closeUpdateSuccessPopup();
    }, 3000);
  }

  // ========== FORM METHODS (unchanged, but use toasts) ==========
  private createAddBankForm(): FormGroup {
    return this.fb.group(
      {
        website: ["", Validators.required],
        accountNumber: [
          "",
          [Validators.required, Validators.pattern(/^\d{10,20}$/)],
        ],
        confirmAccountNumber: ["", Validators.required],
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
        minAmount: [
          "",
          [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
        ],
        maxAmount: [
          "",
          [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
        ],
      },
      { validators: this.accountNumberMatchValidator },
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

  // ========== MODAL WEBSITE LOADING ==========
  loadWebsites() {
    if (this.currentRoleId) {
      const sub = this.headService
        .getAllHeadsWithWebsitesById(this.currentRoleId, "BANK")
        .subscribe({
          next: (res: any) => {
            this.websites = Array.isArray(res) ? res : [];
            this.modalFilteredWebsites = [...this.websites];
          },
          error: (err) => {
            console.error("Error loading websites", err);
            this.websites = [];
            this.modalFilteredWebsites = [];
          },
        });
      this.subs.add(sub);
    }
  }

  // ========== MODAL WEBSITE SEARCH ==========
  onModalWebsiteSearch() {
    const term = this.modalWebsiteSearch.toLowerCase();
    if (term) {
      this.modalFilteredWebsites = this.websites.filter(
        (w) =>
          w.websiteDomain.toLowerCase().includes(term) ||
          (w.currency && w.currency.toLowerCase().includes(term)),
      );
    } else {
      this.modalFilteredWebsites = [...this.websites];
    }
  }

  selectWebsiteForForm(website: Website) {
    this.selectedModalWebsite = website;
    this.showModalWebsiteDropdown = false;
    this.modalWebsiteSearch = "";
    this.modalFilteredWebsites = [...this.websites];
    this.addBankForm.patchValue({ website: website.websiteId });
    this.addBankForm.get("website")?.markAsTouched();
  }

  clearWebsiteSelection() {
    this.selectedModalWebsite = null;
    this.addBankForm.patchValue({ website: "" });
    this.addBankForm.get("website")?.markAsTouched();
  }

  // ========== MODAL OPEN/CLOSE ==========
  openAddBankModal() {
    this.showAddModal = true;
    this.loadWebsites();
    this.modalWebsiteSearch = "";
    this.modalFilteredWebsites = [];
    this.selectedModalWebsite = null;
    this.showModalWebsiteDropdown = false;
    this.addBankForm.reset();
    this.addBankForm.markAsUntouched();
    document.body.style.overflow = "hidden";
  }

  closeAddBankModal() {
    this.showAddModal = false;
    this.addBankForm.reset();
    this.isAdding = false;
    this.modalWebsiteSearch = "";
    this.modalFilteredWebsites = [];
    this.selectedModalWebsite = null;
    this.showModalWebsiteDropdown = false;
    document.body.style.overflow = "auto";
  }

  openUpdateModal(account: BankAccount) {
    this.editingAccount = account;
    this.updateForm = {
      accountNo: account.accountNo || "",
      accountHolderName: account.accountHolderName || "",
      ifsc: account.ifsc || "",
      limitAmount: account.limitAmount || "",
      accountType: account.accountType || "saving",
      status: account.status || "active",
      minAmount: account.minAmount,
      maxAmount: account.maxAmount,
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
      limitAmount: "",
      accountType: "saving",
      status: "active",
      minAmount: "",
      maxAmount: "",
    };
    this.isSubmitting = false;
    document.body.style.overflow = "auto";
    this.closeUpdateSuccessPopup();
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

  @HostListener("document:click")
  onDocumentClick() {
    this.activeActionDropdown = null;
  }

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
      website: account.websiteId || account.website,
      entityId: this.currentRoleId,
      entityType: this.role,
      accountNo: account.accountNo,
      accountHolderName: account.accountHolderName,
      ifsc: account.ifsc,
      limitAmount: account.limitAmount,
      accountType: account.accountType,
      status: status,
      minAmount: account.minAmount,
      maxAmount: account.maxAmount,
    };

    const sub = this.bankService.update(payload).subscribe({
      next: () => {
        account.status = status;
        this.isUpdatingStatus[accountId] = false;
        this.activeActionDropdown = null;
        this.fetchBankAccounts();
        alert(`Account status updated to ${status}`);
      },
      error: (err) => {
        console.error("Error updating account status:", err);
        this.isUpdatingStatus[accountId] = false;
        alert("Error updating account status. Please try again.");
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
      alert("Please fill in all required fields correctly.");
      return;
    }

    this.isAdding = true;

    const formData = this.addBankForm.value;
    const payload = {
      entityId: this.currentRoleId,
      entityType: this.role,
      website: formData.website,
      accountNo: formData.accountNumber,
      accountHolderName: formData.accountHolderName,
      ifsc: formData.ifscCode,
      accountType: formData.accountType,
      limitAmount: formData.limitAmount,
      status: "active",
      minAmount: formData.minAmount,
      maxAmount: formData.maxAmount,
    };

    const sub = this.bankService.addBank(payload).subscribe({
      next: () => {
        this.isAdding = false;
        this.closeAddBankModal();
        this.fetchBankAccounts();
        this.showAddSuccess("Bank account added successfully!");
      },
      error: (err) => {
        console.error("Error adding bank account:", err);
        this.isAdding = false;
        alert("Error adding bank account. Please try again.");
      },
    });
    this.subs.add(sub);
  }

  submitUpdate() {
    if (!this.editingAccount) return;

    if (!this.updateForm.accountNo.trim()) {
      alert("Account Number is required");
      return;
    }
    if (!this.updateForm.accountHolderName.trim()) {
      alert("Account Holder Name is required");
      return;
    }
    if (!this.updateForm.ifsc.trim()) {
      alert("IFSC Code is required");
      return;
    }
    if (!this.updateForm.limitAmount || this.updateForm.limitAmount <= 0) {
      alert("Please enter a valid limit amount");
      return;
    }

    this.isSubmitting = true;

    const payload = {
      id: this.editingAccount.id,
      website: this.editingAccount.websiteId,
      entityId: this.currentRoleId,
      entityType: this.role,
      accountNo: this.updateForm.accountNo,
      accountHolderName: this.updateForm.accountHolderName,
      ifsc: this.updateForm.ifsc,
      limitAmount: this.updateForm.limitAmount,
      accountType: this.updateForm.accountType,
      status: this.updateForm.status,
      minAmount: this.updateForm.minAmount,
      maxAmount: this.updateForm.maxAmount,
    };

    const sub = this.bankService.update(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.fetchBankAccounts();
        this.showUpdateSuccess("Bank account updated successfully!");
      },
      error: (err) => {
        console.error("Error updating bank account:", err);
        this.isSubmitting = false;
        alert("Error updating bank account. Please try again.");
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
    if (!amount) return "-";
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }

  formatCurrencyShort(amount: string): string {
    if (!amount) return "-";
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    if (num >= 10000000) {
      return (num / 10000000).toFixed(1).replace(/\.0$/, "") + "Cr";
    } else if (num >= 100000) {
      return (num / 100000).toFixed(1).replace(/\.0$/, "") + "L";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toString();
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isWebsiteDropdown = target.closest(".relative")?.contains(target);
    if (!isWebsiteDropdown && this.showWebsiteDropdown) {
      this.showWebsiteDropdown = false;
    }
  }
}
