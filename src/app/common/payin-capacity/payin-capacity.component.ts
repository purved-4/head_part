import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
} from "@angular/core";
import { UpiService } from "../../pages/services/upi.service";
import { BankService } from "../../pages/services/bank.service";
import { SnackbarService } from "../snackbar/snackbar.service";

@Component({
  selector: "app-payin-capacity",
  templateUrl: "./payin-capacity.component.html",
  styleUrls: ["./payin-capacity.component.css"],
})
export class PayinCapacityComponent implements OnChanges, OnInit {
  //  CONTROL
  @Input() show: boolean = false;

  //  API PARAMS (IMPORTANT)
  @Input() entityId!: string;
  @Input() entityType!: string;
  @Input() portalId!: string;
  @Input() bankId!: any;

  @Input() mode!: "UPI" | "BANK" | "ERC20" | "TRC20" | "SPL" | "BEP20" | "OMNI";
  @Input() payinId!: string;

  @Output() close = new EventEmitter<void>();

  capacityRanges: any[] = [];
  limitAmount: number | null = null;
  isLoading: boolean = false;
  isEditing: boolean = false;
  private cryptoModes = ["ERC20", "TRC20", "SPL", "BEP20", "OMNI"];
  constructor(
    private bankService: BankService,
    private upiService: UpiService,
    private snackBar: SnackbarService,
  ) {}

  ngOnInit() {}

  // ================= AUTO FETCH =================
  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.show &&
      this.entityId &&
      this.payinId &&
      (changes["show"]?.currentValue === true ||
        changes["payinId"] ||
        changes["mode"])
    ) {
      this.fetchCapacity();
    }
  }

  // ================= FETCH =================
  fetchCapacity() {
    if (!this.entityId || !this.payinId) return;

    this.isLoading = true;

    const isCrypto = this.cryptoModes.includes(this.mode);

    if (this.mode === "BANK" || isCrypto) {
      this.bankService
        .getPayinCapacity(
          this.entityType,
          this.entityId,
          this.mode as any,
          this.payinId,
        )
        .subscribe({
          next: (res: any) => {
            this.capacityRanges = res.capacities || [];
            this.limitAmount = res.limitAmount || null;
            this.isLoading = false;
          },
          error: (err) => {
            this.snackBar.show(
              err?.error?.message || "Failed to load capacity",
              false,
            );
            this.isLoading = false;
          },
        });
    } else if (this.mode === "UPI") {
      this.upiService
        .getPayinCapacity(
          this.entityType,
          this.entityId,
          this.portalId,
          this.mode,
          this.payinId,
        )
        .subscribe({
          next: (res: any) => {
            this.capacityRanges = res.capacities || [];
            this.limitAmount = res.limitAmount || null;
            this.isLoading = false;
          },
          error: (err) => {
            this.snackBar.show(
              err?.error?.message || "Failed to load capacity",
              false,
            );
            this.isLoading = false;
          },
        });
    }
  }

  // ================= EDIT =================
  enableEdit() {
    this.isEditing = true;

    if (this.capacityRanges.length === 0) {
      this.addRange();
    }
  }

  // ================= ADD =================
  addRange() {
    const last = this.capacityRanges[this.capacityRanges.length - 1];

    this.capacityRanges.push({
      minRange: null,
      maxRange: null,
      quantity: null,
    });
  }

  // ================= REMOVE =================
  removeRange(index: number) {
    this.capacityRanges.splice(index, 1);
  }

  // ================= VALIDATION =================
  isValidRanges(): boolean {
    for (let i = 0; i < this.capacityRanges.length; i++) {
      const r = this.capacityRanges[i];

      if (r.minRange == null || r.maxRange == null || r.quantity == null) {
        return false;
      }

      if (r.minRange > r.maxRange) return false;

      if (i > 0) {
        const prev = this.capacityRanges[i - 1];
        if (r.minRange < prev.maxRange) return false;
      }
    }

    return true;
  }

  // ================= SAVE =================
  save() {
    if (!this.isValidRanges()) {
      this.snackBar.show("invalid Ranges", false);
      return;
    }

    const isCrypto = this.cryptoModes.includes(this.mode);

    const payload = {
      entityType: this.entityType,
      entityId: this.entityId,
      portalId: this.portalId,
      mode: this.mode,
      payinId: this.payinId,
      ranges: this.capacityRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      })),
    };

    this.isLoading = true;

    // ================= BANK + CRYPTO =================
    if (this.mode === "BANK" || isCrypto) {
      this.bankService.addPayinCapacity(payload).subscribe({
        next: () => {
          this.isLoading = false;
          this.isEditing = false;
          this.fetchCapacity();
        },
        error: (err: any) => {
          this.isLoading = false;
          this.snackBar.show(
            err?.error?.message || "Failed to save capacity",
            false,
          );
        },
      });

      // ================= UPI =================
    } else if (this.mode === "UPI") {
      this.upiService.addPayinCapacity(payload).subscribe({
        next: () => {
          this.isLoading = false;
          this.isEditing = false;
          this.fetchCapacity();
        },
        error: (err: any) => {
          this.isLoading = false;
          this.snackBar.show(
            err?.error?.message || "Failed to save capacity",
            false,
          );
        },
      });
    }
  }

  // ================= CLOSE =================
  closeModal() {
    this.close.emit();
    this.isEditing = false;
  }
}
