import { Component, OnInit } from "@angular/core";
import { BulkUpdateService } from "../../pages/services/bulk-update.service";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";

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

  constructor(
    private bulkService: BulkUpdateService,
    private authService: UserStateService,
    private snackBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.currentEntityId = this.authService.getCurrentEntityId();
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

    this.bulkService.getReslovedNotificationById(id).subscribe({
      next: (data: PercentageChangeRequestWithBlockersDTO) => {
        this.selectedRequest = data;
        this.isDetailLoading = false;
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
}
