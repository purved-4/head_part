import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { debounceTime, distinctUntilChanged, map, Subscription } from "rxjs";
import { INDIAN_BANKS } from "../../../../utils/constants";
import { BankService } from "../../../../pages/services/bank.service";
import { SnackbarService } from "../../../snackbar/snackbar.service";
import { UserStateService } from "../../../../store/user-state.service";

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
    minRange: any | null;
    maxRange: any | null;
    quantity: any | null;
  }[] = [{ minRange: null, maxRange: null, quantity: null }];
  isBankNameFetching: boolean = false;
  isBankNameEditable: boolean = false;
  ifscSubject: any;
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

    // IFSC valueChanges pe debounce — most reliable way
    const ifscSub = this.addBankForm
      .get("ifscCode")!
      .valueChanges.pipe(
        debounceTime(600),
        distinctUntilChanged(),
        map((val: string) => (val || "").toUpperCase().replace(/\s/g, "")),
      )
      .subscribe((ifsc) => {
        console.log("IFSC value changed:", ifsc); // debug ke liye

        const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (ifscPattern.test(ifsc)) {
          console.log("Pattern matched, calling API..."); // debug
          this.fetchBankFromIfsc(ifsc);
        } else {
          // Reset bank name jab pattern invalid ho
          this.isBankNameEditable = false;
          this.isBankNameFetching = false;
          this.addBankForm.get("bankName")?.setValue("");
          this.addBankForm.get("bankName")?.disable();
        }
      });
    this.subs.add(ifscSub);
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
    this.isBankNameFetching = false;
    this.isBankNameEditable = false;
    this.addBankForm.get("bankName")?.disable();
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
    this.isBankNameFetching = false;
    this.isBankNameEditable = false;
    this.addBankForm.get("bankName")?.disable();

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

    this.isAdding = true;
    const formData = this.addBankForm.getRawValue();

    // Sirf valid ranges
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

    const payload: any = {
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
      ranges: validRanges.length ? validRanges : null,
    };
    const sub = this.bankService.addBank(payload).subscribe({
      next: (res) => {
        this.isAdding = false;
        this.closeAddBankModal();

        this.snack.show(
          res.message || "Bank account added successfully!",
          true,
        );

        this.formSubmitted.emit();
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
  onIfscInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formattedValue = input.value.replace(/\s/g, "").toUpperCase();

    this.addBankForm
      .get("ifscCode")
      ?.setValue(formattedValue, { emitEvent: false });
    input.value = formattedValue;
    this.addBankForm
      .get("ifscCode")
      ?.setValue(formattedValue, { emitEvent: true }); // emitEvent: TRUE
    input.value = formattedValue;

    // Pattern incomplete hone par reset karo
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscPattern.test(formattedValue)) {
      this.isBankNameEditable = false;
      this.isBankNameFetching = false;
      this.addBankForm.get("bankName")?.setValue("");
      this.addBankForm.get("bankName")?.disable();
    }

    // Subject mein push karo, debounce handle karega
    this.ifscSubject.next(formattedValue);
  }
  fetchBankFromIfsc(ifsc: string): void {
    this.isBankNameFetching = true;
    this.isBankNameEditable = false;
    this.addBankForm.get("bankName")?.disable();

    const sub = this.bankService.getIfsc(ifsc).subscribe({
      next: (data) => {
        this.isBankNameFetching = false;
        const bankName = data?.bankName || data?.bank || "";
        this.addBankForm.get("bankName")?.setValue(bankName);
        // Fetched hai to locked rahega, edit se unlock hoga
      },
      error: () => {
        this.isBankNameFetching = false;
        this.isBankNameEditable = true; // Error pe manually enter karne do
        this.addBankForm.get("bankName")?.enable();
        this.snack.show(
          "Could not fetch bank name. Please enter manually.",
          false,
        );
      },
    });
    this.subs.add(sub);
  }

  enableBankNameEdit(): void {
    this.isBankNameEditable = true;
    this.addBankForm.get("bankName")?.enable();
    this.addBankForm.get("bankName")?.setValue("");
  }
}
