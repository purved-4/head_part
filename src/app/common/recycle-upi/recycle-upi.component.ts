
import { Component, OnInit } from "@angular/core";
import { UpiService } from "../../pages/services/upi.service";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { fileBaseUrl } from "../../pages/services/helper";
import { MultimediaService } from "../../pages/services/multimedia.service";

@Component({
  selector: "app-recycle-upi",
  templateUrl: "./recycle-upi.component.html",
  styleUrls: ["./recycle-upi.component.css"],
})
export class RecycleUpiComponent implements OnInit {
  upis: any[] = [];
  currentRoleId: any;
  Math = Math;
  currentPage = 1;
  pageSize = 10;

  totalElements = 0;
  totalPagesCount = 0;
  viewMode: "table" | "grid" = "table";
  loading = false;
  constructor(
    private upiService: UpiService,
    private userStateService: UserStateService,
    private snack: SnackbarService,
    private multiMediaService: MultimediaService,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.fetchDeletedUpis();
  }

  setView(mode: "table" | "grid") {
    this.viewMode = mode;
  }
  fetchDeletedUpis(): void {
    this.loading = true;

    const options = {
      page: this.currentPage - 1,
      size: this.pageSize,
    };

    this.upiService
      .getByEntityIdAndDeactivePaginated(this.currentRoleId, options)
      .subscribe({
        next: (res: any) => {
          const rows = res?.content || [];

          this.upis = rows.map((r: any) => ({
            ...r,
            qrImageId: r.qrImagePath, // 👈 THIS IS YOUR ID
            qrImagePath: null, // blob URL
          }));

          // load images via blob API
          this.upis.forEach((upi: any) => {
            if (upi.qrImageId) {
              this.loadQrImage(upi);
            }
          });

          this.totalElements = res?.totalElements || 0;
          this.totalPagesCount = res?.totalPages || 0;
          this.loading = false;
        },

        error: (err) => {
          console.error(err);
          this.upis = [];
          this.loading = false;
        },
      });
  }
  loadQrImage(upi: any): void {
    const url = `${fileBaseUrl}/${upi.qrImageId}`;

    this.multiMediaService.getImageByUrlBlob(url).subscribe({
      next: (blob: Blob) => {
        const objectUrl = URL.createObjectURL(blob);
        upi.qrImagePath = objectUrl;
      },
      error: () => {
        upi.qrImagePath = null;
      },
    });
  }

  reactivateUpi(upi: any) {
    this.upiService.toogleUpiDeleted(upi.id).subscribe({
      next: () => {
        this.snack.show("UPI reactivated successfully!", true);
        this.fetchDeletedUpis();
      },
      error: () => {
        this.snack.show("Failed to reactivate UPI", false);
      },
    });
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchDeletedUpis();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPagesCount) {
      this.currentPage++;
      this.fetchDeletedUpis();
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPagesCount;
    const current = this.currentPage;

    const pages: number[] = [];

    const start = Math.max(1, current - 1);
    const end = Math.min(total, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number) {
    if (page !== this.currentPage) {
      this.currentPage = page;
      this.fetchDeletedUpis();
    }
  }
}
