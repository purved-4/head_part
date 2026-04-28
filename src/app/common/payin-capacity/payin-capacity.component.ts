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

  @Input() mode!: "UPI" | "BANK";
  @Input() payinId!: string;

  @Output() close = new EventEmitter<void>();

  capacityRanges: any[] = [];
  limitAmount: number | null = null;
  isLoading: boolean = false;
  isEditing: boolean = false;

  constructor(
    private bankService: BankService,
    private upiService: UpiService,
  ) {}

  ngOnInit() {
    console.log("comming in the payin");

    this.fetchCapacity();
  }

  // ================= AUTO FETCH =================
  ngOnChanges(changes: SimpleChanges): void {
    if (this.show && this.entityId  && this.payinId) {
      this.fetchCapacity();
    }
  }

  // ================= FETCH =================
  fetchCapacity() {
    console.log(" INPUTS:", {
      entityId: this.entityId,
      portalId: this.portalId,
      payinId: this.payinId,
      mode: this.mode,
      entityType: this.entityType,
    });

    console.log(this.entityId, this.portalId, this.payinId);

    if (!this.entityId|| !this.payinId) {
      return;
    }

    this.isLoading = true;

    if (this.mode === "BANK") {
      this.bankService
        .getPayinCapacity(
          this.entityType,
          this.entityId,
          // this.portalId,
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
      payinId: this.payinId,

      limitAmount: Number(this.limitAmount),

      ranges: this.capacityRanges.map((r) => ({
        minRange: Number(r.minRange),
        maxRange: Number(r.maxRange),
        quantity: Number(r.quantity),
      })),
    };

    this.isLoading = true;

    if (this.mode === "BANK") {
      this.bankService.addPayinCapacity(payload).subscribe({
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
    } else if (this.mode === "UPI") {
      this.upiService.addPayinCapacity(payload).subscribe({
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
  }

  // ================= CLOSE =================
  closeModal() {
    this.close.emit();
    this.isEditing = false;
  }
}

