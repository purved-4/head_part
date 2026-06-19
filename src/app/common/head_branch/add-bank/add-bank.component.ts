
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { INDIAN_BANKS } from "../../../utils/constants";
import { BankService } from "../../../pages/services/bank.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { UserStateService } from "../../../store/user-state.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-add-bank",

  templateUrl: "./add-bank.component.html",
  styleUrl: "./add-bank.component.css",
})
export class AddBankComponent implements OnInit, OnDestroy {
  @Input() currency: any;
  @Input() mode: any;
  @Input() embeddedMode: boolean = false; // true = inside inventory modal, hides its own modal wrapper
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();
  showAddModal = false;
  isAdding = false;
  currentRoleId: any;
  role: any;

  addBankForm: FormGroup;
  showDebug = false;
  bankSearchTerm: string = "";
  filteredBanks: string[] = INDIAN_BANKS;
  showBankDropdown: boolean = false;
  isCustomBank: boolean = false;
  capacityRanges: {
    minRange: number | null;
    maxRange: number | null;
    quantity: number | null;
  }[] = [{ minRange: null, maxRange: null, quantity: null }];

  constructor(
    private bankService: BankService,
    private snack: SnackbarService,
    private userStateService: UserStateService,
    private fb: FormBuilder,
  ) {
    this.addBankForm = this.createAddBankForm();
  }

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();
  }

  ngOnDestroy(): void {}
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

        fttAcceptance: [true],
      },
      // { validators: this.accountNumberMatchValidator },
    );
  }

  openAddBankModal(): void {
    this.showAddModal = true;
    // this.loadPortals();

    this.addBankForm.reset({
      portal: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
      ifscCode: "",
      accountType: "",
      limitAmount: "",
      fttAcceptance: true,
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
      fttAcceptance: true,
    });
    this.isAdding = false;

    // Reset bank dropdown state
    this.bankSearchTerm = "";
    this.filteredBanks = INDIAN_BANKS;
    this.isCustomBank = false;

    document.body.style.overflow = "auto";
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
  onBankInputFocus(): void {
    this.showBankDropdown = true;
    this.filteredBanks = INDIAN_BANKS;
  }
  onBankInputBlur(): void {
    setTimeout(() => {
      this.showBankDropdown = false;
    }, 200);
  }
  clearBankSelection(): void {
    this.addBankForm.patchValue({ bankName: "" });
    this.filteredBanks = INDIAN_BANKS;
    this.isCustomBank = false;
  }
  selectCustomBank(): void {
    const customName = this.bankSearchTerm.trim();

    if (!customName) return;

    this.addBankForm.patchValue({ bankName: customName });
    this.isCustomBank = true;
    this.showBankDropdown = false;
  }
  onIfscInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formattedValue = input.value.replace(/\s/g, "").toUpperCase();

    this.addBankForm.get("ifscCode")?.setValue(formattedValue, {
      emitEvent: false,
    });

    input.value = formattedValue;
  }
  onAccountNumberChange() {
    if (this.addBankForm.get("confirmAccountNumber")?.value) {
      this.addBankForm.updateValueAndValidity();
    }
  }
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
      currency: this.currency?.currency,
      bankName: formData.bankName,
      accountNo: formData.accountNumber,
      accountHolderName: formData.accountHolderName,
      ifsc: formData.ifscCode,
      accountType: formData.accountType,
      limitAmount: formData.limitAmount,
      status: true,
      fttAcceptance: formData.fttAcceptance,

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

        this.snack.show(
          res.message || "Bank account added successfully!",
          true,
        );
        this.formSubmitted.emit(); // <-- IMPORTANT
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
  private subs = new Subscription();
  selectBank(bank: string): void {
    this.addBankForm.patchValue({ bankName: bank });
    this.showBankDropdown = false;
    this.isCustomBank = false;
  }
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
}
