
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { Subscription } from "rxjs";
import { BankService } from "../../../pages/services/bank.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { UserStateService } from "../../../store/user-state.service";
import { INDIAN_BANKS } from "../../../utils/constants";

@Component({
  selector: "app-bank-details",
  templateUrl: "./bank-details.component.html",
  styleUrl: "./bank-details.component.css",
})
export class BankDetailsComponent implements OnInit, OnDestroy {
  @Input() bankData: any;
  @Input() fetchBankAccountsFn!: () => void;

  @Output() close = new EventEmitter<void>();

  isEditMode = false;
  isSubmitting = false;

  entityId: any;
  entityType: any;
  updateBankSearchTerm = "";
  updateFilteredBanks: string[] = INDIAN_BANKS;
  updateShowBankDropdown = false;
  updateIsCustomBank = false;
  private subs = new Subscription();

  updateForm: any = {
    accountNo: "",
    accountHolderName: "",
    bankName: "",
    ifsc: "",
    limitAmount: 0,
    accountType: "",
    fttAcceptance: false,
  };

  constructor(
    private bankService: BankService,
    private snack: SnackbarService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();

    this.entityType = this.userStateService.getRole();

    this.patchForm();
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;

    if (this.isEditMode) {
      this.patchForm();
    }
  }

  patchForm(): void {
    this.updateForm = {
      accountNo: this.bankData?.accountNo || "",

      accountHolderName: this.bankData?.accountHolderName || "",

      bankName: this.bankData?.bankName || "",

      ifsc: this.bankData?.ifsc || "",

      limitAmount: this.bankData?.limitAmount || 0,

      accountType: this.bankData?.accountType || "saving",

      fttAcceptance: this.bankData?.fttAcceptance || false,
    };
  }

  closeModal(): void {
    this.close.emit();
  }

  copyAccountNumber(): void {
    const accNo = this.isEditMode
      ? this.updateForm.accountNo
      : this.bankData?.accountNo;

    if (accNo) {
      navigator.clipboard.writeText(accNo);

      this.snack.show("Account number copied", true);
    }
  }

  submitUpdate(): void {
    if (!this.bankData) return;

    if (!this.updateForm.accountNo?.trim()) {
      this.snack.show("Account Number is required", false);
      return;
    }

    if (!this.updateForm.accountHolderName?.trim()) {
      this.snack.show("Account Holder Name is required", false);
      return;
    }

    if (!this.updateForm.ifsc?.trim()) {
      this.snack.show("IFSC Code is required", false);
      return;
    }

    if (!this.updateForm.limitAmount || this.updateForm.limitAmount <= 0) {
      this.snack.show("Please enter a valid limit amount", false);
      return;
    }

    this.isSubmitting = true;

    const payload = {
      id: this.bankData?.id,

      portal: this.bankData?.portal || null,

      entityId: this.entityId,

      entityType: this.entityType,

      accountNo: this.updateForm.accountNo,

      accountHolderName: this.updateForm.accountHolderName,

      bankName: this.updateForm.bankName,

      ifsc: this.updateForm.ifsc,

      limitAmount: Number(this.updateForm.limitAmount),

      accountType: this.updateForm.accountType,

      fttAcceptance: this.updateForm.fttAcceptance,
    };

    console.log("UPDATE PAYLOAD =>", payload);

    const sub = this.bankService.update(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;

        this.bankData = {
          ...this.bankData,

          ...this.updateForm,
        };

        this.isEditMode = false;

        this.snack.show(
          res?.message || "Bank account updated successfully!",
          true,
        );
        if (this.fetchBankAccountsFn) {
          this.fetchBankAccountsFn();
        }
        this.closeModal();
      },

      error: (err: any) => {
        this.isSubmitting = false;

        console.log("UPDATE ERROR =>", err);

        this.snack.show(
          err?.error?.message || "Error updating bank account",
          false,
        );
      },
    });

    this.subs.add(sub);
  }

  formatDate(date: any): string {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getMaskedAccount(account: string): string {
    if (!account) return "-";

    const last4 = account.slice(-4);

    return `XXXXXX${last4}`;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

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
}
