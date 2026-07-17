import { Component, OnInit } from "@angular/core";
import { BulkUpdateService } from "../../pages/services/bulk-update.service";
import { UserStateService } from "../../store/user-state.service";

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
export class ReslovedNotificationComponent implements OnInit {
  notifications: PercentageChangeRequestDTO[] = [];
  isLoading = false;
  errorMessage = "";

  currentEntityId: any;
  userId: any;

  isModalOpen = false;
  isDetailLoading = false;
  detailError = "";
  selectedRequest: PercentageChangeRequestWithBlockersDTO | null = null;

  constructor(
    private bulkService: BulkUpdateService,
    private authService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.currentEntityId = this.authService.getCurrentEntityId();
    this.userId = this.authService.getUserId();
    this.loadResolvedNotifications();
  }

  loadResolvedNotifications(): void {
    this.isLoading = true;
    this.errorMessage = "";

    this.bulkService
      .getAllResolvedNotification(this.currentEntityId)
      .subscribe({
        next: (data: PercentageChangeRequestDTO[]) => {
          this.notifications = data || [];
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = "Failed to load resolved notifications.";
          this.isLoading = false;
          console.error(err);
        },
      });
  }

  // item.id list se aata hai -> yahi requestId ke roop me detail API ko jayega
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
