import { Component, OnInit } from "@angular/core";
import { UpiService } from "../../pages/services/upi.service";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { fileBaseUrl } from "../../pages/services/helper";

@Component({
  selector: "app-recycle-upi",
  templateUrl: "./recycle-upi.component.html",
  styleUrls: ["./recycle-upi.component.css"],
})
export class RecycleUpiComponent implements OnInit {

  upis: any[] = [];
  currentRoleId: any;
Math = Math
  currentPage = 1;
  pageSize = 10;

  totalElements = 0;
  totalPagesCount = 0;
  viewMode: 'table' | 'grid' = 'table';
  loading = false; 
  constructor(
    private upiService: UpiService,
    private userStateService: UserStateService,
    private snack: SnackbarService
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.fetchDeletedUpis();
  }

   setView(mode: 'table' | 'grid') {
    this.viewMode = mode;
  }

fetchDeletedUpis(): void {
 this.loading = true;
  const options = {
    page: this.currentPage - 1,
    size: this.pageSize
  };

  this.upiService
    .getByEntityIdAndDeactivePaginated(this.currentRoleId, options)
    .subscribe({
      next: (res: any) => {

        console.log("Recycle API response:", res);

        const rows = res?.content || [];

        this.upis = rows.map((r: any) => ({
          ...r,
          qrImagePath: r.qrImagePath
            ? `${fileBaseUrl}/${r.qrImagePath}`
            : null,
        }));

        this.totalElements = res?.totalElements || 0;
        this.totalPagesCount = res?.totalPages || 0;
          this.loading = false;
      },
      error: (err) => {
        console.error("Error loading recycle UPIs:", err);
        this.upis = [];
         this.loading = false;
      },
    });
}

  reactivateUpi(upi: any) {

    this.upiService.toogleUpiStatus(upi.id).subscribe({
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
    this.fetchDeletedUpis()
  }

}
}



