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
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Subscription } from "rxjs";
import { SnackbarService } from "../../../snackbar/snackbar.service";
import { UserStateService } from "../../../../store/user-state.service";
import { UpiService } from "../../../../pages/services/upi.service";
import { BankService } from "../../../../pages/services/bank.service";

@Component({
  selector: "app-add-aani",
  templateUrl: "./add-aani.component.html",
  styleUrl: "./add-aani.component.css",
})
export class AddAaniComponent implements OnInit, OnDestroy {
  @Input() currency: any;
  @Input() embeddedMode: boolean = false;
  @Input() preselectedBankId: any = null;
  @ViewChild("qrcodeRef", { static: false })
  qrcodeElem!: ElementRef;

  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  addAaniForm: FormGroup;

  isAddingAani = false;
  currentRoleId: any;
  role: any;
  generatingQr = false;
  showInventoryModal = false;

  // modal
  showAddModal = false;

  // bank dropdown (same like bank component)
  aaniPortalSearch = "";
  filteredBanks: any[] = [];
  showAaniPortalDropdown = false;
  selectedAaniPortal: any = null;

  // QR
  qrMode: "generate" | "upload" = "generate";
  qrData: string = "";
  selectedImage: string | null = null;
  manualQrFile: File | null = null;
  generatedFile: any;
  banks: any[] = [];

  capacityRanges: any[] = [{ minRange: null, maxRange: null, quantity: null }];

  // backend: private String validateAani(String value) -> ^[A-Za-z0-9._+@:-]{3,128}$
  private readonly AANI_ID_PATTERN = /^[A-Za-z0-9._+@:-]{3,128}$/;

  private subs = new Subscription();
  constructor(
    private fb: FormBuilder,
    private snack: SnackbarService,
    private userStateService: UserStateService,
    private upiService: UpiService,
    private bankService: BankService,
  ) {
    this.addAaniForm = this.createForm();
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
      bankId: [null],
      aaniId: [
        "",
        [Validators.required, Validators.pattern(this.AANI_ID_PATTERN)],
      ],
      limitAmount: ["", Validators.required],
      fttAcceptance: [true],
      partialPayinEnabled: [false],
    });
  }

  // ---------------- MODAL ----------------
  openAddModal(): void {
    this.showAddModal = true;
    document.body.style.overflow = "hidden";
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addAaniForm.reset({
      bankId: null,
      aaniId: "",
      limitAmount: "",
      fttAcceptance: true,
      partialPayinEnabled: true,
    });
    this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];
    this.selectedImage = null;
    this.qrData = "";
    document.body.style.overflow = "auto";
  }

  // ---------------- BANK SEARCH ----------------
  onAaniPortalSearch(): void {
    const term = this.aaniPortalSearch?.toLowerCase() || "";

    this.filteredBanks = this.banks.filter(
      (b: any) =>
        (b.accountHolderName || "").toLowerCase().includes(term) ||
        (b.accountNo || "").toLowerCase().includes(term),
    );

    this.showAaniPortalDropdown = true;
  }

  openAaniPortalDropdown(): void {
    this.filteredBanks = [...this.banks];
    this.showAaniPortalDropdown = true;
  }

  onAaniPortalFocus(): void {
    this.filteredBanks = [...this.banks];
    this.showAaniPortalDropdown = true;
  }

  selectAaniPortal(bank: any): void {
    this.selectedAaniPortal = bank;

    this.addAaniForm.patchValue({
      bankId: bank.id,
    });

    this.aaniPortalSearch = bank.accountHolderName || bank.accountNo;

    this.showAaniPortalDropdown = false;
  }

  clearAaniPortalSelection(): void {
    this.selectedAaniPortal = null;
    this.aaniPortalSearch = "";
    this.addAaniForm.patchValue({ bankId: null });
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

  updateFrom(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();
    this.capacityRanges[index].minRange = value === "" ? null : Number(value);
  }
  updateTo(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();
    this.capacityRanges[index].maxRange = value === "" ? null : Number(value);
  }

  updateQuantity(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();
    this.capacityRanges[index].quantity = value === "" ? null : Number(value);
  }

  // ---------------- SUBMIT ----------------
  async submitAddAani(): Promise<void> {
    if (this.addAaniForm.invalid) {
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
      status: true,
      paymentMode: "AANI",
      currency: this.currency?.currency,
      bankId: this.addAaniForm.value.bankId,
      vpa: this.addAaniForm.value.aaniId,
      limitAmount: this.addAaniForm.value.limitAmount,
      qrMode: this.qrMode,
      fttAcceptance: this.addAaniForm.value.fttAcceptance,
      partialPayinEnabled: this.addAaniForm.getRawValue().partialPayinEnabled,
    };
    console.log(payload);

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

    this.isAddingAani = true;

    // NOTE: reusing upiService.add() since backend endpoint is same for UPI/AANI
    // dto.paymentMode differentiates it server-side. Agar Aani ke liye alag
    // endpoint/service hai toh yaha upiService.add -> aaniService.add karna hoga.
    const sub = this.upiService.add(formData).subscribe({
      next: (res) => {
        this.isAddingAani = false;

        this.closeAddModal();

        this.snack.show(res.message || "Aani added successfully", true);

        this.formSubmitted.emit();
      },
      error: (err) => {
        this.isAddingAani = false;

        this.snack.show(err?.error?.message || "Error adding Aani", false);
      },
    });

    this.subs.add(sub);
  }

  loadBanks(): void {
    // FIX: pehle "INR" hardcoded tha, Aani AED ke liye hai
    this.bankService.getBankForQr(this.currentRoleId, "AED").subscribe({
      next: (res: any) => {
        const banks = res?.data ?? [];

        this.banks = banks;
        this.filteredBanks = [...banks];

        if (this.preselectedBankId) {
          const matchedBank = this.banks.find(
            (bank: any) => String(bank.id) === String(this.preselectedBankId),
          );

          if (matchedBank) {
            this.selectedAaniPortal = matchedBank;

            this.addAaniForm.patchValue({
              bankId: matchedBank.id,
            });

            this.aaniPortalSearch =
              matchedBank.accountHolderName || matchedBank.accountNo || "";
          }
        }
      },

      error: (error) => {
        this.snack.show(error?.error?.message || "Error fetching banks", false);

        this.banks = [];
        this.filteredBanks = [];
        this.selectedAaniPortal = null;
      },
    });
  }

  generateQrFromAaniId(): void {
    const aaniId = String(this.addAaniForm.get("aaniId")?.value || "").trim();

    if (!aaniId) {
      this.snack.show("Enter Aani ID first", false);
      return;
    }

    if (!this.AANI_ID_PATTERN.test(aaniId)) {
      this.snack.show("Invalid Aani payment identifier", false);
      return;
    }

    this.qrMode = "generate";

    const aaniIntent = `aani://pay?id=${encodeURIComponent(aaniId)}&cu=AED`;

    this.qrData = aaniIntent;

    const filename = `aani_qr_${this.sanitizeFilename(aaniId)}_${Date.now()}.png`;

    // delay to allow QR render
    setTimeout(() => {
      const canvas = document.querySelector(
        "qrcode canvas",
      ) as HTMLCanvasElement;

      if (!canvas) {
        this.snack.show("Remove Existing Uploaded Image", false);
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

  private captureQrImage(aaniId: string): void {
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
              const filename = `aani_qr_${this.sanitizeFilename(aaniId)}_${Date.now()}.png`;

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
      (r) => r.minRange != null && r.minRange > 0,
    );
    if (!validRanges.length) return null;
    return Math.min(...validRanges.map((r) => r.minRange));
  }
}
