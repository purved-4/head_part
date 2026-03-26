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
  // 🔥 CONTROL
  @Input() show: boolean = false;

  // 🔥 API PARAMS (IMPORTANT)
  @Input() entityId!: string;
  @Input() entityType!: string;
  @Input() portalId!: string;
  @Input() mode!: "UPI" | "BANK";
  @Input() topupId!: string;

  @Output() close = new EventEmitter<void>();

  // 🔥 STATE
  capacityRanges: any[] = [];
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
    console.log("🔥 INPUTS:", {
      entityId: this.entityId,
      portalId: this.portalId,
      topupId: this.topupId,
      mode: this.mode,
      entityType: this.entityType,
    });

    if (!this.entityId || !this.portalId || !this.topupId) {
      console.warn("❌ Missing params");
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
          console.log("🔥 API RESPONSE:", res);

          // ✅ FIX (IMPORTANT)
          if (Array.isArray(res)) {
            this.capacityRanges = res;
          } else if (res?.data && Array.isArray(res.data)) {
            this.capacityRanges = Array.isArray(res) ? res : res?.data || [];
          } else {
            this.capacityRanges = [];
          }

          console.log("✅ UI DATA:", this.capacityRanges);

          this.isLoading = false;
        },
        error: (err) => {
          console.error("❌ Fetch error", err);
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
  }

  // ================= ADD =================
  addRange() {
    const last = this.capacityRanges[this.capacityRanges.length - 1];

    this.capacityRanges.push({
      minRange: last?.maxRange != null ? last.maxRange : 1,
      maxRange: null,
      quantity: null,
    });
  }

  // ================= REMOVE =================
  removeRange(index: number) {
    this.capacityRanges.splice(index, 1);
    this.recalculateRanges();
  }

  // ================= AUTO FIX =================
  recalculateRanges() {
    for (let i = 1; i < this.capacityRanges.length; i++) {
      const prev = this.capacityRanges[i - 1];
      if (prev?.maxRange != null) {
        this.capacityRanges[i].minRange = prev.maxRange;
      }
    }
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
      alert("Invalid ranges 😅");
      return;
    }

    const payload = {
      entityType: this.entityType,
      entityId: this.entityId,
      portalId: this.portalId,
      mode: this.mode,
      topupId: this.topupId,
      ranges: this.capacityRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      })),
    };

    console.log("🚀 SAVE PAYLOAD:", payload);

    this.isLoading = true;

    this.upiService.addTopupCapacity(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.isEditing = false;

        // 🔥 refresh after save
        this.fetchCapacity();
      },
      error: (err: any) => {
        console.error("❌ Save error", err);
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
