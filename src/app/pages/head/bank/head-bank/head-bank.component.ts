import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subscription, forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { BankService } from "../../../services/bank.service";
import { sourceMapsEnabled } from "process";
import { BranchService } from "../../../services/branch.service";
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
  minAmount:string,
      maxAmount:string
}

@Component({
  selector: 'app-head-bank',
  templateUrl: './head-bank.component.html',
  styleUrl: './head-bank.component.css'
})
export class HeadBankComponent implements OnInit, OnDestroy {
  bankAccounts: BankAccount[] = [];
  filteredBankAccounts: BankAccount[] = [];
  searchAccountNo = "";
  searchHolder = "";
  searchWebsite = "";
  searchStatus = "";

  branchId: any;
  loading = false;
  private subs = new Subscription();
  userId: any;

  // Add modal properties
  showAddModal = false;
  isAdding = false;
  websites: any[] = [];
  addBankForm: FormGroup;

  // Update modal properties
  showUpdateModal = false;
  editingAccount: any = null;
  updateForm: any = {
    accountNo: "",
    accountHolderName: "",
    ifsc: "",
    limitAmount: "",
    accountType: "saving",
    status: "active",
    minAmount:'',
    maxAmount:''
  };
  isSubmitting = false;
  currentRoleId: any;
  currentUserId: any;
  role: any;

  constructor(
    private route: ActivatedRoute,
    private bankService: BankService,
    private fb: FormBuilder,
    private userStateService: UserStateService,
    private headService: HeadService
  ) {
    this.addBankForm = this.createAddBankForm();
  }

  ngOnInit() {
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.loadBankAccounts(this.currentRoleId);

    // const routeSub = this.route.paramMap.subscribe(pm => {
    //   this.currentRoleId = pm.get('branchId');
    //   this.userId = pm.get('userId');
    //   if (this.currentRoleId) {
    //   } else {
    //     this.bankAccounts = [];
    //     this.filteredBankAccounts = [];
    //   }
    // });
    // this.subs.add(routeSub);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private createAddBankForm(): FormGroup {
    return this.fb.group(
      {
        websiteList: ["", Validators.required],
        accountNumber: [
          "",
          [Validators.required, Validators.pattern(/^\d{10,20}$/)],
        ],
        confirmAccountNumber: ["", Validators.required],
        accountHolderName: ["", [Validators.required, Validators.minLength(3)]],
        ifscCode: [
          "",
          [
            Validators.required,
            // Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
          ],
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
      }
    );
  }

  private accountNumberMatchValidator(g: FormGroup) {
    const accountNumber = g.get("accountNumber")?.value;
    const confirmAccountNumber = g.get("confirmAccountNumber")?.value;
    return accountNumber === confirmAccountNumber ? null : { mismatch: true };
  }

  // Open add bank modal
  openAddBankModal() {
    this.showAddModal = true;
    this.loadWebsites();
    document.body.style.overflow = "hidden";
  }

  // Close add bank modal
  closeAddBankModal() {
    this.showAddModal = false;
    this.addBankForm.reset();
    this.isAdding = false;
    document.body.style.overflow = "auto";
  }

  // Load websites for dropdown
   loadWebsites() {
    if (this.currentRoleId) {
      this.headService.getAllHeadsWithWebsitesById(this.currentRoleId,"BANK").subscribe({
        next: (res: any) => {
          console.log(res);
          
          this.websites = Array.isArray(res) ? res : [];
        },
        error: (err) => {
          console.error('Error loading websites', err);
          this.websites = [];
        }
      });
    }
  }

  // Submit add bank form
  submitAddBankForm() {
    if (this.addBankForm.invalid) {
      this.addBankForm.markAllAsTouched();
      return;
    }

    this.isAdding = true;

    const formData = this.addBankForm.value;
    const payload = {
      entityId: this.currentRoleId,
      entityType: this.role,
      website: formData.websiteList,
      accountNo: formData.accountNumber,
      accountHolderName: formData.accountHolderName,
      ifsc: formData.ifscCode,
      accountType: formData.accountType,
      limitAmount: formData.limitAmount,
      status: "active",
      minAmount:formData.minAmount,
      maxAmount:formData.maxAmount
    };

    this.bankService.addBank(payload).subscribe({
      next: (res: any) => {
        this.isAdding = false;
        this.closeAddBankModal();
        this.loadBankAccounts(this.currentRoleId); // Reload the list
        alert("Bank account added successfully!");
      },
      error: (err) => {
        console.error("Error adding bank account:", err);
        this.isAdding = false;
        alert("Error adding bank account. Please try again.");
      },
    });
  }

  // Rest of your existing methods remain the same
  private loadBankAccounts(branchId: string) {
    this.loading = true;
    const sub = this.bankService
      .getBankDataWithSubAdminId(branchId)
      .pipe(
        catchError((err) => {
          console.error("Error fetching bank accounts", err);
          this.loading = false;
          return of([] as any[]);
        })
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

            return {
              id: r.id,
              branchId: r.branchId ?? null,
              website: r.websiteDomain ?? null,
              websiteId: r.website ?? null,
              accountHolderName: r.accountHolderName ?? r.name ?? "-",
              accountNo: r.accountNo ?? r.accountNumber ?? "",
              accountType: r.accountType ?? "",
              status,
              ifsc: r.ifsc ?? "",
              bankRange: r.bankRange ?? r.range ?? "",
              createdAt: r.createdAt
                ? new Date(r.createdAt)
                : r.createdAt ?? null,
              limitAmount: r.limitAmount,
              minAmount:r.minAmount,
      maxAmount:r.maxAmount
            } as BankAccount;
          });

          this.filteredBankAccounts = [...this.bankAccounts];
        },
        (err) => {
          this.loading = false;
          console.error("Failed to load bank accounts", err);
          this.filteredBankAccounts = [];
        }
      );

    this.subs.add(sub);
  }

  onSearch() {
    const qAccNo = (this.searchAccountNo || "").trim();
    const qHolder = (this.searchHolder || "").trim().toLowerCase();
    const qWebsite = (this.searchWebsite || "").trim().toLowerCase();
    const qStatus = (this.searchStatus || "").trim().toLowerCase();

    this.filteredBankAccounts = this.bankAccounts.filter((account) => {
      if (qAccNo && !(account.accountNo || "").includes(qAccNo)) return false;
      if (
        qHolder &&
        !(account.accountHolderName || "").toLowerCase().includes(qHolder)
      )
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
      return true;
    });
  }

  getStatusClass(status: string): string {
    switch ((status || "").toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200";
      case "frozen":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  // Open update modal
  openUpdateModal(account: BankAccount) {
    this.editingAccount = account;
    this.updateForm = {
      accountNo: account.accountNo || "",
      accountHolderName: account.accountHolderName || "",
      ifsc: account.ifsc || "",
      limitAmount: account.limitAmount || "",
      accountType: account.accountType || "saving",
      status: account.status || "active",
      minAmount:account.minAmount,
      maxAmount:account.maxAmount
    };
    this.showUpdateModal = true;
    document.body.style.overflow = "hidden";
  }

  // Close update modal
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
      minAmount:'',
      maxAmount:''
    };
    this.isSubmitting = false;
    document.body.style.overflow = "auto";
  }

  // Submit update form
  submitUpdate() {
    if (!this.editingAccount) return;

    // Basic validation
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

    // Prepare payload
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
      minAmount:this.updateForm.minAmount,
      maxAmount:this.updateForm.maxAmount
    };
    console.log("Submitting update for Bank Account:", payload);

    // Call update service
    this.bankService.update(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.loadBankAccounts(this.currentRoleId); // Reload the list
        alert("Bank account updated successfully!");
      },
      error: (err) => {
        console.error("Error updating bank account:", err);
        this.isSubmitting = false;
        alert("Error updating bank account. Please try again.");
      },
    });
  }

  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber) return "";
    if (accountNumber.length <= 4) return accountNumber;
    return "*".repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  }
}








