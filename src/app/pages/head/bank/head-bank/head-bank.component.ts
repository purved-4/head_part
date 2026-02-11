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
  bankAccounts: BankAccount[] = [];
  filteredBankAccounts: BankAccount[] = [];
  paginatedAccounts: BankAccount[] = [];

  // Search filters
  searchAccountNo = "";
  searchHolder = "";
  searchWebsite = "";
  searchIFSC = "";
  searchStatus = "";
  searchAccountType = "";
  searchMinAmount: number | null = null;
  searchMaxAmount: number | null = null;
  searchLimit: number | null = null;

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // Website search properties
  allWebsites: string[] = [];
  filteredWebsites: string[] = [];
  uniqueWebsites: string[] = [];

  loading = false;
  private subs = new Subscription();

  // Add modal properties
  showAddModal = false;
  isAdding = false;
  websites: Website[] = [];
  addBankForm: FormGroup;
  showDebug = false; // Changed from true to false to hide debug info

  // Update modal properties
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
  currentRoleId: any;
  currentUserId: any;
  role: any;

  // Modal website search properties
  modalWebsiteSearch: string = "";
  modalFilteredWebsites: Website[] = [];
  selectedModalWebsite: Website | null = null;
  showWebsiteDropdown = false;

  // Action dropdown property
  activeActionDropdown: string | null = null;

  // Status update loading
  isUpdatingStatus: { [key: string]: boolean } = {};

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

    this.loadBankAccounts(this.currentRoleId);

    // Listen for clicks outside website dropdown
    document.addEventListener("click", this.handleOutsideClick.bind(this));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    document.removeEventListener("click", this.handleOutsideClick.bind(this));
  }

  // ========== FORM METHODS ==========
  private createAddBankForm(): FormGroup {
    return this.fb.group(
      {
        // Changed from websiteList to website to match template
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
      {
        validators: this.accountNumberMatchValidator,
      },
    );
  }

  private accountNumberMatchValidator(g: FormGroup) {
    const accountNumber = g.get("accountNumber")?.value;
    const confirmAccountNumber = g.get("confirmAccountNumber")?.value;
    return accountNumber === confirmAccountNumber ? null : { mismatch: true };
  }

  onAccountNumberChange() {
    // Trigger validation check when account number changes
    if (this.addBankForm.get("confirmAccountNumber")?.value) {
      this.addBankForm.updateValueAndValidity();
    }
  }

  // ========== MODAL METHODS ==========
  openAddBankModal() {
    this.showAddModal = true;
    this.loadWebsites();
    this.modalWebsiteSearch = "";
    this.modalFilteredWebsites = [];
    this.selectedModalWebsite = null;
    this.showWebsiteDropdown = false;

    // Reset form and mark as untouched
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
    this.showWebsiteDropdown = false;
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
  }

  // ========== WEBSITE METHODS ==========
  loadWebsites() {
    if (this.currentRoleId) {
      this.headService
        .getAllHeadsWithWebsitesById(this.currentRoleId, "BANK")
        .subscribe({
          next: (res: any) => {
            console.log("Websites loaded:", res);
            this.websites = Array.isArray(res) ? res : [];
            // Initialize filtered websites with all websites
            this.modalFilteredWebsites = [...this.websites];
          },
          error: (err) => {
            console.error("Error loading websites", err);
            this.websites = [];
            this.modalFilteredWebsites = [];
          },
        });
    }
  }

  toggleWebsiteDropdown() {
    this.showWebsiteDropdown = !this.showWebsiteDropdown;
  }

  onWebsiteSearch() {
    if (!this.searchWebsite) {
      this.filteredWebsites = this.allWebsites;
      return;
    }

    const searchTerm = this.searchWebsite.toLowerCase();
    this.filteredWebsites = this.allWebsites.filter((website) =>
      website.toLowerCase().includes(searchTerm),
    );
  }

  selectWebsite(website: string) {
    this.searchWebsite = website;
    this.filteredWebsites = [];
    this.onSearch();
  }

  // ========== MODAL WEBSITE SEARCH METHODS ==========
  onModalWebsiteSearch() {
    const searchTerm = this.modalWebsiteSearch.toLowerCase();
    if (searchTerm) {
      this.modalFilteredWebsites = this.websites.filter(
        (website) =>
          website.websiteDomain.toLowerCase().includes(searchTerm) ||
          (website.currency &&
            website.currency.toLowerCase().includes(searchTerm)),
      );
    } else {
      this.modalFilteredWebsites = [...this.websites];
    }
  }

  selectWebsiteForForm(website: Website) {
    console.log("Website selected:", website);
    this.selectedModalWebsite = website;
    this.showWebsiteDropdown = false;
    this.modalWebsiteSearch = "";
    this.modalFilteredWebsites = [...this.websites];

    // Update form control value with website ID - changed from websiteList to website
    this.addBankForm.patchValue({
      website: website.websiteId,
    });

    // Mark the control as touched to trigger validation
    this.addBankForm.get("website")?.markAsTouched();

    console.log("Form value after selection:", this.addBankForm.value);
    console.log("Form valid:", this.addBankForm.valid);
    console.log("Form errors:", this.addBankForm.errors);
    console.log(
      "Website control valid:",
      this.addBankForm.get("website")?.valid,
    );
    console.log(
      "Website control errors:",
      this.addBankForm.get("website")?.errors,
    );
  }

  clearWebsiteSelection() {
    this.selectedModalWebsite = null;
    this.addBankForm.patchValue({
      website: "",
    });
    this.addBankForm.get("website")?.markAsTouched();
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isWebsiteDropdown = target.closest(".relative")?.contains(target);

    if (!isWebsiteDropdown && this.showWebsiteDropdown) {
      this.showWebsiteDropdown = false;
    }
  }

  // ========== ACTION DROPDOWN METHODS ==========
  toggleActionDropdown(accountId: string, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (this.activeActionDropdown === accountId) {
      this.activeActionDropdown = null;
    } else {
      this.activeActionDropdown = accountId;
    }
  }

  @HostListener("document:click")
  onDocumentClick() {
    this.activeActionDropdown = null;
  }

  // ========== STATUS UPDATE METHODS ==========
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

    this.bankService.update(payload).subscribe({
      next: (res: any) => {
        account.status = status;
        this.isUpdatingStatus[accountId] = false;
        this.activeActionDropdown = null;
        this.onSearch();
        alert(`Account status updated to ${status}`);
      },
      error: (err) => {
        console.error("Error updating account status:", err);
        this.isUpdatingStatus[accountId] = false;
        alert("Error updating account status. Please try again.");
      },
    });
  }

  // ========== DATA LOADING METHODS ==========
  private loadBankAccounts(branchId: string) {
    this.loading = true;
    const sub = this.bankService
      .getBankDataWithSubAdminId(branchId)
      .pipe(
        catchError((err) => {
          console.error("Error fetching bank accounts", err);
          this.loading = false;
          return of([] as any[]);
        }),
      )
      .subscribe(
        (res: any) => {
          this.loading = false;

          const rows = Array.isArray(res.data) ? res.data : [];

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

          this.allWebsites = [
            ...new Set(
              this.bankAccounts
                .filter((account) => account.websiteDomain || account.website)
                .map(
                  (account) => account.websiteDomain || account.website || "",
                ),
            ),
          ];

          this.uniqueWebsites = this.allWebsites;
          this.filteredWebsites = this.allWebsites;

          this.onSearch();
          this.updatePagination();
        },
        (err) => {
          this.loading = false;
          console.error("Failed to load bank accounts", err);
          this.filteredBankAccounts = [];
          this.updatePagination();
        },
      );

    this.subs.add(sub);
  }

  // ========== FILTER METHODS ==========
  // ========== FILTER METHODS ==========
  onSearch() {
    const qAccNo = (this.searchAccountNo || "").trim();
    const qHolder = (this.searchHolder || "").trim().toLowerCase();
    const qWebsite = (this.searchWebsite || "").trim().toLowerCase();
    const qIFSC = (this.searchIFSC || "").trim().toUpperCase();
    const qStatus = (this.searchStatus || "").trim().toLowerCase();
    const qAccountType = (this.searchAccountType || "").trim().toLowerCase();
    const qMinAmount = this.searchMinAmount;
    const qMaxAmount = this.searchMaxAmount;
    const qLimit = this.searchLimit;

    this.filteredBankAccounts = this.bankAccounts.filter((account) => {
      if (qAccNo && !(account.accountNo || "").includes(qAccNo)) return false;
      if (
        qHolder &&
        !(account.accountHolderName || "").toLowerCase().includes(qHolder)
      )
        return false;
      if (qIFSC && !(account.ifsc || "").toUpperCase().includes(qIFSC))
        return false;

      const wd = (account.websiteDomain || account.website || "")
        .toString()
        .toLowerCase();
      if (qWebsite && !wd.includes(qWebsite)) return false;

      if (
        qStatus &&
        (account.status || "").toString().toLowerCase() !== qStatus
      )
        return false;

      if (qAccountType) {
        const accountType = (account.accountType || "")
          .toString()
          .toLowerCase();
        const searchType = qAccountType.toLowerCase();

        if (searchType === "saving") {
          if (accountType !== "saving" && accountType !== "savings") {
            return false;
          }
        } else if (accountType !== searchType) {
          return false;
        }
      }

      const accountLimit = parseFloat(account.limitAmount) || 0;
      const accountMinAmount = parseFloat(account.minAmount) || 0;
      const accountMaxAmount = parseFloat(account.maxAmount) || 0;

      // Fix: Check if account limit is LESS THAN OR EQUAL TO search limit
      if (qLimit !== null) {
        // If user entered 500000 (50 lakhs), show accounts with limit <= 500000
        if (accountLimit > qLimit) return false;
      }

      // Min amount filter: account min should be GREATER THAN OR EQUAL TO search min
      if (qMinAmount !== null && accountMinAmount < qMinAmount) return false;

      // Max amount filter: account max should be LESS THAN OR EQUAL TO search max
      if (qMaxAmount !== null && accountMaxAmount > qMaxAmount) return false;

      return true;
    });

    this.currentPage = 1;
    this.updatePagination();
  }
  resetFilters() {
    this.searchAccountNo = "";
    this.searchHolder = "";
    this.searchWebsite = "";
    this.searchIFSC = "";
    this.searchStatus = "";
    this.searchAccountType = "";
    this.searchMinAmount = null;
    this.searchMaxAmount = null;
    this.searchLimit = null;
    this.filteredWebsites = this.allWebsites;
    this.onSearch();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchAccountNo ||
      this.searchHolder ||
      this.searchWebsite ||
      this.searchIFSC ||
      this.searchStatus ||
      this.searchAccountType ||
      this.searchMinAmount !== null ||
      this.searchMaxAmount !== null ||
      this.searchLimit !== null
    );
  }

  // ========== PAGINATION METHODS ==========
  updatePagination() {
    this.totalPages = Math.ceil(
      this.filteredBankAccounts.length / this.itemsPerPage,
    );
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedAccounts = this.filteredBankAccounts.slice(
      startIndex,
      endIndex,
    );
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onItemsPerPageChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
      } else if (this.currentPage >= this.totalPages - 2) {
        for (let i = this.totalPages - 4; i <= this.totalPages; i++)
          pages.push(i);
      } else {
        for (let i = this.currentPage - 2; i <= this.currentPage + 2; i++)
          pages.push(i);
      }
    }

    return pages;
  }

  // ========== FORM SUBMISSION METHODS ==========
  submitAddBankForm() {
    console.log("=== Form Submission Started ===");
    console.log("Form value:", this.addBankForm.value);
    console.log("Form valid:", this.addBankForm.valid);
    console.log("Form errors:", this.addBankForm.errors);

    // Log each control's status
    Object.keys(this.addBankForm.controls).forEach((key) => {
      const control = this.addBankForm.get(key);
      console.log(`${key}:`, {
        value: control?.value,
        valid: control?.valid,
        errors: control?.errors,
        touched: control?.touched,
      });
    });

    if (this.addBankForm.invalid) {
      console.log("Form is INVALID - marking all as touched");
      this.addBankForm.markAllAsTouched();

      // Force validation display
      Object.keys(this.addBankForm.controls).forEach((key) => {
        const control = this.addBankForm.get(key);
        control?.markAsTouched();
      });

      alert("Please fill in all required fields correctly.");
      return;
    }

    console.log("Form is VALID - proceeding with submission");
    this.isAdding = true;

    const formData = this.addBankForm.value;
    console.log("Form data to submit:", formData);

    // Updated from formData.websiteList to formData.website
    const payload = {
      entityId: this.currentRoleId,
      entityType: this.role,
      website: formData.website, // Changed from websiteList to website
      accountNo: formData.accountNumber,
      accountHolderName: formData.accountHolderName,
      ifsc: formData.ifscCode,
      accountType: formData.accountType,
      limitAmount: formData.limitAmount,
      status: "active",
      minAmount: formData.minAmount,
      maxAmount: formData.maxAmount,
    };

    console.log("API Payload:", payload);

    this.bankService.addBank(payload).subscribe({
      next: (res: any) => {
        console.log("API Success Response:", res);
        this.isAdding = false;
        this.closeAddBankModal();
        this.loadBankAccounts(this.currentRoleId);
        alert("Bank account added successfully!");
      },
      error: (err) => {
        console.error("API Error:", err);
        console.error("Error details:", err.error);
        this.isAdding = false;
        alert("Error adding bank account. Please try again.");
      },
      complete: () => {
        console.log("API call completed");
      },
    });
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

    this.bankService.update(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.loadBankAccounts(this.currentRoleId);
        alert("Bank account updated successfully!");
      },
      error: (err) => {
        console.error("Error updating bank account:", err);
        this.isSubmitting = false;
        alert("Error updating bank account. Please try again.");
      },
    });
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

  // For template access
  get Math() {
    return Math;
  }
}
