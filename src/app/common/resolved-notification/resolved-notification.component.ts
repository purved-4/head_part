import { Component, OnInit } from "@angular/core";
import { BulkUpdateService } from "../../pages/services/bulk-update.service";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { Observable } from "rxjs";

interface PercentageChangeRequestDTO {
  id: string;
  requesterId: string;
  requesterType: string;
  requestedPayin: number;
  requestedPayout: number;
  requestedFtt: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface BlockerDTO {
  id: string;
  blockingEntityId: string;
  blockingEntityType: string;
  resolved: boolean;
  resolvedAt: string;
}

interface PercentageChangeRequestWithBlockersDTO {
  requestId: string;
  requesterId: string;
  requesterType: string;
  requestedPayin: number;
  requestedPayout: number;
  requestedFtt: number;
  status: string;
  createdAt: string;
  blockers: BlockerDTO[];
}

@Component({
  selector: "app-resolved-notification",
  templateUrl: "./resolved-notification.component.html",
})
export class ResolvedNotificationComponent implements OnInit {
  notifications: PercentageChangeRequestDTO[] = [];
  isLoading = false;
  errorMessage = "";

  currentEntityId: any;
  userId: any;
  isRefreshing = false;
  isModalOpen = false;
  isDetailLoading = false;
  detailError = "";
  selectedRequest: PercentageChangeRequestWithBlockersDTO | null = null;
  percentageForm: {
    payinPercentage: number | null;
    payoutPercentage: number | null;
    fttPercentage: number | null;
  } = {
    payinPercentage: 0,
    payoutPercentage: 0,
    fttPercentage: 0,
  };

  percentageErrors = {
    payinPercentage: "",
    payoutPercentage: "",
    fttPercentage: "",
  };

  private percentageFieldMaxMap: {
    payinPercentage: "requestedPayin";
    payoutPercentage: "requestedPayout";
    fttPercentage: "requestedFtt";
  } = {
    payinPercentage: "requestedPayin",
    payoutPercentage: "requestedPayout",
    fttPercentage: "requestedFtt",
  };
  isSubmittingBulkUpdate = false;

  // Which single blocker row is currently expanded for resolution
  activeBlockerType: string | null = null;

  currentRoleName: any;
  constructor(
    private bulkService: BulkUpdateService,
    private authService: UserStateService,
    private snackBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.currentEntityId = this.authService.getCurrentEntityId();
    this.currentRoleName = this.authService.getRole();
    this.userId = this.authService.getUserId();
    this.loadResolvedNotifications();
  }

  loadResolvedNotifications(isBackgroundRefresh = false) {
    if (isBackgroundRefresh) {
      this.isRefreshing = true;
    } else {
      this.isLoading = true;
    }
    this.errorMessage = "";

    this.bulkService
      .getAllResolvedNotification(this.currentEntityId)
      .subscribe({
        next: (data) => {
          this.notifications = data;
          this.isLoading = false;
          this.isRefreshing = false;
        },
        error: (err) => {
          this.snackBar.show(
            err.error?.message || "Failed to load resolved notifications",
            false,
          );
          this.errorMessage = "Failed to load resolved notifications";
          this.isLoading = false;
          this.isRefreshing = false;
        },
      });
  }
  viewDetails(id: string): void {
    this.isModalOpen = true;
    this.isDetailLoading = true;
    this.detailError = "";
    this.selectedRequest = null;

    // this.bulkService.getReslovedNotificationById(id).subscribe({
    //   next: (data: PercentageChangeRequestWithBlockersDTO) => {
    //     this.selectedRequest = data;
    //     this.isDetailLoading = false;
    //   },
    //   error: (err) => {
    //     this.detailError = "Failed to load request details.";
    //     this.isDetailLoading = false;
    //     console.error(err);
    //   },
    // });
    this.bulkService.getReslovedNotificationById(id).subscribe({
      next: (data: PercentageChangeRequestWithBlockersDTO) => {
        this.selectedRequest = data;
        this.isDetailLoading = false;

        // Reset the bulk-update percentage form for this request
        this.percentageForm = {
          payinPercentage: 0,
          payoutPercentage: 0,
          fttPercentage: 0,
        };
        this.percentageErrors = {
          payinPercentage: "",
          payoutPercentage: "",
          fttPercentage: "",
        };
        this.activeBlockerType = null;
      },
      error: (err) => {
        this.detailError = "Failed to load request details.";
        this.isDetailLoading = false;
        console.error(err);
      },
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedRequest = null;
    this.detailError = "";
  }

  // ---------------------------
  // Bulk update (percentage adjustment) - only for PENDING CHIEF requests
  // ---------------------------

  validatePercentage(field: keyof typeof this.percentageForm): void {
    if (!this.selectedRequest) return;

    const maxKey = this.percentageFieldMaxMap[field];
    const max = Number(this.selectedRequest[maxKey] ?? 0);
    const value = this.percentageForm[field];

    if (
      value === null ||
      value === undefined ||
      (value as any) === "" ||
      isNaN(value as any)
    ) {
      this.percentageErrors[field] = "This field is required";
    } else if (value < 0) {
      this.percentageErrors[field] = "Percentage cannot be negative";
    } else if (value > max) {
      this.percentageErrors[field] = `Cannot exceed ${max}%`;
    } else {
      this.percentageErrors[field] = "";
    }
  }

  isPercentageFormValid(): boolean {
    if (!this.selectedRequest) return false;

    const fields: (keyof typeof this.percentageForm)[] = [
      "payinPercentage",
      "payoutPercentage",
      "fttPercentage",
    ];

    return fields.every((field) => {
      const maxKey = this.percentageFieldMaxMap[field];
      const max = Number(this.selectedRequest![maxKey] ?? 0);
      const value = this.percentageForm[field];

      return (
        value !== null &&
        value !== undefined &&
        (value as any) !== "" &&
        !isNaN(value as any) &&
        value >= 0 &&
        value <= max
      );
    });
  }

  // submitBulkUpdate(): void {
  //   if (!this.selectedRequest) return;

  //   if (!this.isPercentageFormValid()) {
  //     this.snackBar.show(
  //       `Please fix the highlighted fields before submitting.`,
  //       false,
  //     );
  //     return;
  //   }

  //   const percentagePayload = {
  //     payinPercentage: this.percentageForm.payinPercentage as number,
  //     payoutPercentage: this.percentageForm.payoutPercentage as number,
  //     fttPercentage: this.percentageForm.fttPercentage as number,
  //   };

  //   this.isSubmittingBulkUpdate = true;

  //   this.bulkService
  //     .updateBulkManager({
  //       chiefId: this.currentEntityId,
  //       percentage: percentagePayload,
  //     })
  //     .subscribe({
  //       next: () => {
  //         this.isSubmittingBulkUpdate = false;
  //         this.snackBar.show("Percentage updated successfully", true);
  //         this.closeModal();
  //         this.loadResolvedNotifications(true);
  //       },
  //       error: (err) => {
  //         this.isSubmittingBulkUpdate = false;
  //         this.snackBar.show(err?.error?.message || "Update failed", false);
  //       },
  //     });
  // }

  submitBulkUpdate(): void {
    if (!this.selectedRequest || !this.activeBlockerType) return;

    if (!this.isPercentageFormValid()) {
      this.snackBar.show(
        `Please fix the highlighted fields before submitting.`,
        false,
      );
      return;
    }

    const percentagePayload = {
      payinPercentage: this.percentageForm.payinPercentage as number,
      payoutPercentage: this.percentageForm.payoutPercentage as number,
      fttPercentage: this.percentageForm.fttPercentage as number,
    };

    const actingRole = this.currentRoleName?.toUpperCase(); // who is logged in

    let request$: Observable<any> | null = null;

    if (this.activeBlockerType === "MANAGER") {
      request$ = this.bulkService.updateBulkManager({
        chiefId: this.currentEntityId,
        percentage: percentagePayload,
      });
    } else if (this.activeBlockerType === "HEAD") {
      request$ = this.bulkService.updateBulkHead({
        parentId: this.currentEntityId,
        parentType: actingRole === "MANAGER" ? "MANAGER" : "CHIEF",
        percentage: percentagePayload,
      });
    }

    if (!request$) {
      this.snackBar.show("Unable to resolve this blocker type.", false);
      return;
    }

    this.isSubmittingBulkUpdate = true;

    request$.subscribe({
      next: () => {
        this.isSubmittingBulkUpdate = false;
        this.snackBar.show("Percentage updated successfully", true);
        this.closeModal();
        this.loadResolvedNotifications(true);
      },
      error: (err) => {
        this.isSubmittingBulkUpdate = false;
        this.snackBar.show(err?.error?.message || "Update failed", false);
      },
    });
  }

  // Runs each update call one at a time, only moving to the next
  // after the previous one succeeds.
  // private runBulkUpdatesSequentially(
  //   requestFns: (() => Observable<any>)[],
  //   index: number,
  // ): void {
  //   if (index >= requestFns.length) {
  //     this.isSubmittingBulkUpdate = false;
  //     this.snackBar.show("Percentage updated successfully", true);
  //     this.closeModal();
  //     this.loadResolvedNotifications(true);
  //     return;
  //   }

  //   requestFns[index]().subscribe({
  //     next: () => {
  //       this.runBulkUpdatesSequentially(requestFns, index + 1);
  //     },
  //     error: (err) => {
  //       this.isSubmittingBulkUpdate = false;
  //       this.snackBar.show(err?.error?.message || "Update failed", false);
  //     },
  //   });
  // }

  get showBulkUpdateSection(): boolean {
    return (
      !!this.selectedRequest &&
      this.selectedRequest.status === "PENDING" &&
      this.selectedRequest.requesterType === "CHIEF"
    );
  }

  get hasUnresolvedManagerBlocker(): boolean {
    return (this.selectedRequest?.blockers || []).some(
      (b) =>
        !b.resolved && (b.blockingEntityType || "").toUpperCase() === "MANAGER",
    );
  }

  get hasUnresolvedHeadBlocker(): boolean {
    return (this.selectedRequest?.blockers || []).some(
      (b) =>
        !b.resolved && (b.blockingEntityType || "").toUpperCase() === "HEAD",
    );
  }

  toggleResolveTarget(type: "MANAGER" | "HEAD"): void {
    if (this.activeBlockerType === type) {
      this.activeBlockerType = null;
      return;
    }

    this.activeBlockerType = type;

    this.percentageForm = {
      payinPercentage: 0,
      payoutPercentage: 0,
      fttPercentage: 0,
    };
    this.percentageErrors = {
      payinPercentage: "",
      payoutPercentage: "",
      fttPercentage: "",
    };
  }

  // get hasUnresolvedManagerBlocker(): boolean {
  //   return (this.selectedRequest?.blockers || []).some(
  //     (b) =>
  //       !b.resolved && (b.blockingEntityType || "").toUpperCase() === "MANAGER",
  //   );
  // }

  // get hasUnresolvedHeadBlocker(): boolean {
  //   return (this.selectedRequest?.blockers || []).some(
  //     (b) =>
  //       !b.resolved && (b.blockingEntityType || "").toUpperCase() === "HEAD",
  //   );
  // }

  // Toggles the inline update form under a clicked blocker row.
  // Only MANAGER and HEAD blockers are resolvable this way, and only
  // while unresolved.
  onBlockerClick(blocker: BlockerDTO): void {
    const type = (blocker.blockingEntityType || "").toUpperCase();

    if (blocker.resolved) return;
    if (type !== "MANAGER" && type !== "HEAD") return;

    // Toggle: clicking the already-active blocker collapses the form
    if (this.activeBlockerType === type) {
      this.activeBlockerType = null;
      return;
    }

    this.activeBlockerType = type;

    // Reset the form fresh each time a different blocker is selected
    this.percentageForm = {
      payinPercentage: 0,
      payoutPercentage: 0,
      fttPercentage: 0,
    };
    this.percentageErrors = {
      payinPercentage: "",
      payoutPercentage: "",
      fttPercentage: "",
    };
  }
}
