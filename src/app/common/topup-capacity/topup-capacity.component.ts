
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

@Component({
  selector: "app-topup-capacity",
  templateUrl: "./topup-capacity.component.html",
  styleUrls: ["./topup-capacity.component.css"],
})
export class TopupCapacityComponent implements OnChanges, OnInit {
  //  CONTROL
  @Input() show: boolean = false;

  //  API PARAMS (IMPORTANT)
  @Input() entityId!: string;
  @Input() entityType!: string;
  @Input() portalId!: string;
  @Input() mode!: "UPI" | "BANK";
  @Input() topupId!: string;

  @Output() close = new EventEmitter<void>();

  //  STATE
  capacityRanges: any[] = [];
  limitAmount: number | null = null;
  isLoading: boolean = false;
  isEditing: boolean = false;

  constructor(private upiService: UpiService) {}

  ngOnInit() {}

  // ================= AUTO FETCH =================
  ngOnChanges(changes: SimpleChanges): void {
    if (this.show && this.entityId && this.portalId && this.topupId) {
      this.fetchCapacity();
    }
  }

  // ================= FETCH =================
  fetchCapacity() {
    console.log(" INPUTS:", {
      entityId: this.entityId,
      portalId: this.portalId,
      topupId: this.topupId,
      mode: this.mode,
      entityType: this.entityType,
    });

    if (!this.entityId || !this.portalId || !this.topupId) {
      return;
    }

    this.isLoading = true;

    this.upiService
      .getTopupCapacity(
        this.entityType || "BRANCH",
        this.entityId,
        this.portalId,
        this.mode,
        this.topupId,
      )
      .subscribe({
        next: (res: any) => {
          this.capacityRanges = res.capacities || [];

          this.limitAmount = res.limitAmount || null;

          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
        },
      });
  }

  // ================= EDIT =================
  enableEdit() {
    this.isEditing = true;

    if (this.capacityRanges.length === 0) {
      this.addRange();
    }

    if (this.limitAmount == null) {
      this.limitAmount = 0;
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
      alert("Invalid ranges ");
      return;
    }

    const payload = {
      entityType: this.entityType,
      entityId: this.entityId,
      portalId: this.portalId,
      mode: this.mode,
      topupId: this.topupId,

      limitAmount: Number(this.limitAmount),

      ranges: this.capacityRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      })),
    };

    this.isLoading = true;

    this.upiService.addTopupCapacity(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.isEditing = false;

        //  refresh after save
        this.fetchCapacity();
      },
      error: (err: any) => {
        this.isLoading = false;
      },
    });
  }

  // ================= CLOSE =================
  closeModal() {
    this.close.emit();
    this.isEditing = false;
  }
}
