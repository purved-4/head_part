import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { UserStateService } from "../../store/user-state.service";
import { LimitsService } from "../../pages/services/reports/limits.service";
import { UtilsServiceService } from "../../utils/utils-service.service";

@Component({
  selector: "app-add-limit-popup",
  templateUrl: "./add-limit-popup.component.html",
  styleUrl: "./add-limit-popup.component.css",
})
export class AddLimitPopupComponent implements OnInit, OnChanges {
  @Input()
  entityId: any;

  @Input()
  entityType: any;

  @Output()
  onClose = new EventEmitter<void>();

  @Output()
  onSuccess = new EventEmitter<any>();

  transactionAmount: any;

  limitRemainingAmount: any;

  selfLimitRemainingAmount: any;

  currentRoleId: any;

  currentUserRole: any;

  errorMessage: string = "";

  successMessage: string = "";

  isLoading: boolean = false;

  constructor(
    private userStateService: UserStateService,
    private limitService: LimitsService,
    private utilService: UtilsServiceService,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserRole = this.userStateService.getRole();

    if (this.entityId && this.entityType) {
      this.getLimitData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["entityId"] || changes["entityType"]) {
      if (this.entityId && this.entityType) {
        // this.getLimitData();
      }
    }
  }

  addLimit() {
    this.errorMessage = "";
    this.successMessage = "";

    if (!this.transactionAmount || this.transactionAmount <= 0) {
      this.errorMessage =
        "Please enter a valid transactionAmount greater than 0";
      return;
    }

    if (!this.entityId || !this.entityType) {
      this.errorMessage = "Invalid entity details";
      return;
    }

    this.isLoading = true;

    const payload = {
      entityId: this.entityId,
      entityType: this.entityType,
      transactionAmount: this.transactionAmount,
    };

    this.limitService.addLimits(payload).subscribe({
      next: (res) => {
        this.successMessage = "Limit added successfully";
        this.transactionAmount = "";
        this.isLoading = false;

        // Emit success event and close after 1.5 seconds
        this.onSuccess.emit(res);
        setTimeout(() => {
          this.onClose.emit();
        }, 1500);
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || "Failed to add limit. Please try again.";
        this.isLoading = false;
      },
    });
  }

  getLimitData() {
    if (!this.entityId || !this.entityType) {
      this.errorMessage = "Invalid entity details";
      return;
    }

    this.limitService
      .getLatestLimitsByEntityAndTypeUpdate(
        this.currentRoleId,
        this.currentUserRole,
      )
      .subscribe({
        next: (res) => {
          this.selfLimitRemainingAmount = res.totalAvailable;
        },
        error: (error) => {
          this.errorMessage = "Failed to load limit data";
        },
      });

    this.limitService
      .getLatestLimitsByEntityAndTypeUpdate(this.entityId, this.entityType)
      .subscribe({
        next: (res) => {
          this.limitRemainingAmount = res.totalAvailable;
        },
        error: (error) => {
          this.errorMessage = "Failed to load limit data";
        },
      });
  }

  onCancel() {
    this.transactionAmount = "";
    this.errorMessage = "";
    this.successMessage = "";
    this.onClose.emit();
  }
}
