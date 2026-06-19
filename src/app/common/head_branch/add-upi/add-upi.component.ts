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
import { SnackbarService } from "../../snackbar/snackbar.service";
import { UserStateService } from "../../../store/user-state.service";
import { BankService } from "../../../pages/services/bank.service"; // reuse or UPI service
import { UpiService } from "../../../pages/services/upi.service";

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
      min_tran_count: [null],
      min_total_tran_amount: [null],
    });
  }

  // ---------------- MODAL ----------------
  openAddModal(): void {
    this.showAddModal = true;
    document.body.style.overflow = "hidden";
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addUpiForm.reset();
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

    if (!last.minRange || !last.maxRange || !last.quantity) {
      this.snack.show("Fill previous range first", false);
      return;
    }

    this.capacityRanges.push({
      minRange: null,
      maxRange: null,
      quantity: null,
    });
  }

  removeRange(i: number) {
    this.capacityRanges.splice(i, 1);
  }

  updateFrom(i: number, e: any) {
    this.capacityRanges[i].minRange = Number(e.target.value);
  }

  updateTo(i: number, e: any) {
    this.capacityRanges[i].maxRange = Number(e.target.value);
  }

  updateQuantity(i: number, e: any) {
    this.capacityRanges[i].quantity = Number(e.target.value);
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

    const payload = {
      entityId: this.currentRoleId,
      entityType: this.role,
      currency: this.currency?.currency,
      bankId: this.addUpiForm.value.bankId,
      vpa: this.addUpiForm.value.vpa,
      limitAmount: this.addUpiForm.value.limitAmount,
      qrMode: this.qrMode,
      ranges: this.capacityRanges,
    };

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
}
