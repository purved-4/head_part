import { Component, OnInit } from "@angular/core";
import { BankService } from "../../pages/services/bank.service";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";

@Component({
  selector: "app-recycle-bank",
  templateUrl: "./recycle-bank.component.html",
  styleUrls: ["./recycle-bank.component.css"],
})
export class RecycleBankComponent implements OnInit {
  bankAccounts: any[] = [];
  Math = Math;
  currentRoleId: any;

  currentPage = 1;
  pageSize = 6;

  totalElements = 0;
  totalPagesCount = 0;

  loading = false;
  viewMode: "table" | "grid" = "table";

  constructor(
    private bankService: BankService,
    private userStateService: UserStateService,
    private snack: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.fetchDeletedBanks();
  }

  setView(mode: "table" | "grid") {
    this.viewMode = mode;
  }
  fetchDeletedBanks() {
    this.loading = true;

    const options = {
      page: this.currentPage - 1,
      size: this.pageSize,
    };

    this.bankService
      .getBankDataWithSubAdminIdAndDeactivePaginated(
        this.currentRoleId,
        options,
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;

          const rows = res?.data?.content || [];

          this.bankAccounts = rows;

          this.totalElements = res?.data?.totalElements || 0;
          this.totalPagesCount = res?.data?.totalPages || 0;
        },
        error: (err) => {
          this.loading = false;
        },
      });
  }

  reactivateBank(bankId: string) {
    this.bankService.toogleBankDeleted(bankId).subscribe({
      next: () => {
        this.snack.show("Bank reactivated successfully!", true);
        this.fetchDeletedBanks();
      },
      error: () => {
        this.snack.show("Failed to reactivate bank", false);
      },
    });
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchDeletedBanks();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPagesCount) {
      this.currentPage++;
      this.fetchDeletedBanks();
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
      this.fetchDeletedBanks(); // OR fetchDeletedUpis()
    }
  }
}
