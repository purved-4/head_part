import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import { Subscription } from "rxjs";
import { SnackbarService } from "../../../snackbar/snackbar.service";
import { UserStateService } from "../../../../store/user-state.service";
import { UpiService } from "../../../../pages/services/upi.service";
import { BankService } from "../../../../pages/services/bank.service";

@Component({
  selector: "app-add-upi",
  templateUrl: "./add-upi.component.html",
  styleUrl: "./add-upi.component.css",
})
export class AddUpiComponent implements OnInit, OnDestroy {
  @Input() currency: any;
  @Input() embeddedMode: boolean = false;
  @Input() preselectedBankId: any = null;
  @ViewChild("qrcodeRef", { static: false })
  qrcodeElem!: ElementRef;

  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  addUpiForm: FormGroup;

  isAddingUpi = false;
  currentRoleId: any;
  role: any;
  generatingQr = false;
  showInventoryModal = false;

  // modal
  showAddModal = false;

  // bank dropdown (same like bank component)
  upiPortalSearch = "";
  filteredBanks: any[] = [];
  showUpiPortalDropdown = false;
  selectedUpiPortal: any = null;

  // QR
  qrMode: "generate" | "upload" = "generate";
  qrData: string = "";
  selectedImage: string | null = null;
  manualQrFile: File | null = null;
  generatedFile: any;
  banks: any[] = [];

  capacityRanges: any[] = [{ minRange: null, maxRange: null, quantity: null }];

  private subs = new Subscription();
  constructor(
    private fb: FormBuilder,
    private snack: SnackbarService,
    private userStateService: UserStateService,
    private upiService: UpiService,
    private bankService: BankService,
  ) {
    this.addUpiForm = this.createForm();
  }

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();
    this.loadBanks();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ---------------- FORM ----------------
  private createForm(): FormGroup {
    return this.fb.group({
      bankId: [null, Validators.required],
      vpa: ["", [Validators.required]],
      limitAmount: ["", Validators.required],
      fttAcceptance: [true],
      partialPayinEnabled:[true],
      partialPayinMinRange:[{value:null,disabled:false}]
    });
  }

  // ---------------- MODAL ----------------
  openAddModal(): void {
    this.showAddModal = true;
    document.body.style.overflow = "hidden";
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addUpiForm.reset({
    bankId: null,
    vpa: "",
    limitAmount: "",
    fttAcceptance: true,
    partialPayinEnabled: true,
    partialPayinMinRange: null,
  });
    this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];
    this.selectedImage = null;
    this.qrData = "";
    document.body.style.overflow = "auto";
  }

  // ---------------- BANK SEARCH ----------------
  onUpiPortalSearch(): void {
    const term = this.upiPortalSearch?.toLowerCase() || "";

    this.filteredBanks = this.banks.filter(
      (b: any) =>
        (b.accountHolderName || "").toLowerCase().includes(term) ||
        (b.accountNo || "").toLowerCase().includes(term),
    );

    this.showUpiPortalDropdown = true;
  }

  openUpiPortalDropdown(): void {
    this.filteredBanks = [...this.banks];
    this.showUpiPortalDropdown = true;
  }

  onUpiPortalFocus(): void {
    this.filteredBanks = [...this.banks];
    this.showUpiPortalDropdown = true;
  }

  selectUpiPortal(bank: any): void {
    this.selectedUpiPortal = bank;

    this.addUpiForm.patchValue({
      bankId: bank.id,
    });

    this.upiPortalSearch = bank.accountHolderName || bank.accountNo;

    this.showUpiPortalDropdown = false;
  }

  clearUpiPortalSelection(): void {
    this.selectedUpiPortal = null;
    this.upiPortalSearch = "";
    this.addUpiForm.patchValue({ bankId: null });
  }

  // ---------------- QR ----------------
  setQrMode(mode: "generate" | "upload") {
    this.qrMode = mode;
  }

  removeQr(): void {
    this.selectedImage = null;
    this.manualQrFile = null;
    this.qrData = "";
  }

  downloadQr(): void {
    // optional implementation
  }

  // ---------------- CAPACITY ----------------
  addRange() {
    const last = this.capacityRanges[this.capacityRanges.length - 1];

    if (
      last.minRange == null ||
      last.maxRange == null ||
      last.quantity == null
    ) {
      this.snack.show("Please fill previous range first.", false);
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
    this.revalidatePartialPayinMinRange();
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
    this.revalidatePartialPayinMinRange();
  }

  updateFrom(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();

    this.capacityRanges[index].minRange = value === "" ? null : Number(value);
    this.revalidatePartialPayinMinRange();
  }
  updateTo(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();

    this.capacityRanges[index].maxRange = value === "" ? null : Number(value);
    this.revalidatePartialPayinMinRange();
  }

  updateQuantity(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();

    this.capacityRanges[index].quantity = value === "" ? null : Number(value);
  }

  // ---------------- SUBMIT ----------------

  async submitAddUpi(): Promise<void> {

    if (this.addUpiForm.invalid) {
      this.snack.show("Fill required fields", false);
      return;
    }

    if (!this.generatedFile) {
      this.snack.show("Please upload or generate QR first", false);
      return;
    }

    const payload: any = {
      entityId: this.currentRoleId,
      entityType: this.role,
      currency: this.currency?.currency,
      bankId: this.addUpiForm.value.bankId,
      vpa: this.addUpiForm.value.vpa,
      limitAmount: this.addUpiForm.value.limitAmount,
      qrMode: this.qrMode,
      fttAcceptance: this.addUpiForm.value.fttAcceptance,
      partialPayinEnabled: this.addUpiForm.getRawValue().partialPayinEnabled,
  partialPayinMinRange: this.addUpiForm.getRawValue().partialPayinEnabled
    ? this.addUpiForm.getRawValue().partialPayinMinRange
    : null,
    };

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
    payload.ranges = validRanges.length ? validRanges : null;

    if (validRanges.length > 0) {
      payload.ranges = validRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      }));
    }

    const formData = new FormData();

    formData.append(
      "dto",
      new Blob([JSON.stringify(payload)], {
        type: "application/json",
      }),
    );

    formData.append("file", this.generatedFile, this.generatedFile.name);

    this.isAddingUpi = true;

    const sub = this.upiService.add(formData).subscribe({
      next: (res) => {
        this.isAddingUpi = false;

        this.closeAddModal();

        this.snack.show(res.message || "UPI added successfully", true);

        this.formSubmitted.emit();
      },
      error: (err) => {
        this.isAddingUpi = false;

        this.snack.show(err?.error?.message || "Error adding UPI", false);
      },
    });

    this.subs.add(sub);
  }
  loadBanks(): void {
    this.bankService
      .getBankDataWithSubAdminIdAndActivePaginated(this.currentRoleId)
      .subscribe({
        next: (res: any) => {
          const banks = res?.data?.content || [];

          this.banks = banks;
          this.filteredBanks = [...banks];

          // agar bank preselected hai
          if (this.preselectedBankId) {
            const matchedBank = this.banks.find(
              (b: any) => b.id === this.preselectedBankId,
            );

            if (matchedBank) {
              this.selectedUpiPortal = matchedBank;

              this.addUpiForm.patchValue({
                bankId: matchedBank.id,
              });

              this.upiPortalSearch =
                matchedBank.accountHolderName || matchedBank.accountNo;
            }
          }
        },
        error: () => {
          this.banks = [];
          this.filteredBanks = [];
        },
      });
  }

  generateQrFromVpa(): void {
    const vpa = String(this.addUpiForm.get("vpa")?.value || "").trim();

    if (!vpa) {
      this.snack.show("Enter VPA first", false);
      return;
    }

    this.qrMode = "generate";

    const upiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;

    this.qrData = upiIntent;

    const filename = `upi_qr_${this.sanitizeFilename(vpa)}_${Date.now()}.png`;

    // delay to allow QR render
    setTimeout(() => {
      const canvas = document.querySelector(
        "qrcode canvas",
      ) as HTMLCanvasElement;

      if (!canvas) {
        this.snack.show("QR not rendered yet", false);
        return;
      }

      canvas.toBlob((blob) => {
        if (!blob) return;

        this.generatedFile = new File([blob], filename, {
          type: "image/png",
        });
      }, "image/png");
    }, 300);
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
  private captureQrImage(vpa: string): void {
    try {
      if (!this.qrcodeElem?.nativeElement) {
        this.finishQrGeneration();
        return;
      }

      setTimeout(() => {
        const canvas = this.qrcodeElem.nativeElement.querySelector("canvas");

        if (!canvas) {
          this.finishQrGeneration();
          return;
        }

        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) {
              const filename = `upi_qr_${this.sanitizeFilename(vpa)}_${Date.now()}.png`;

              this.generatedFile = new File([blob], filename, {
                type: "image/png",
              });
            }

            this.finishQrGeneration();
          },
          "image/png",
          1.0,
        );
      }, 100);
    } catch (error) {
      this.finishQrGeneration();
    }
  }

  private finishQrGeneration(): void {
    this.generatingQr = false;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9_\-.@]/gi, "_")
      .replace(/_{2,}/g, "_")
      .substring(0, 100);
  }
  get smallestCapacityRangeLimit(): number | null {
  const validRanges = this.capacityRanges.filter(
    (r) => r.minRange != null && r.minRange > 0
  );
  if (!validRanges.length) return null;
  return Math.min(...validRanges.map((r) => r.minRange));
}

private partialPayinMinRangeValidator = (control: AbstractControl): ValidationErrors | null => {
  if (!this.addUpiForm?.get("partialPayinEnabled")?.value) return null;

  const max = this.smallestCapacityRangeLimit;
  if (max == null) return { noCapacityRanges: true };

  if (control.value == null || control.value === "") return { required: true };
  const val = Number(control.value);
  if (val <= 0) return { min: true };
  if (val > max) return { exceedsMax: { max } };

  return null;
};

onPartialPayinToggle(): void {
  const enabled = this.addUpiForm.get("partialPayinEnabled")?.value;
  const limitControl = this.addUpiForm.get("partialPayinMinRange");

  if (enabled) {
    limitControl?.enable();
    limitControl?.setValidators([this.partialPayinMinRangeValidator]);
  } else {
    limitControl?.disable();
    limitControl?.clearValidators();
    limitControl?.setValue(null);
  }
  limitControl?.updateValueAndValidity();
}

private revalidatePartialPayinMinRange(): void {
  const limitControl = this.addUpiForm.get("partialPayinMinRange");
  if (limitControl?.enabled) {
    limitControl.updateValueAndValidity();
  }
}
}
