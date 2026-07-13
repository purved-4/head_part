import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { CryptoService } from "../../../pages/services/crypto.service";
import { UserStateService } from "../../../store/user-state.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";

@Component({
  selector: "app-recycle-crypto",
  templateUrl: "./recycle-crypto.component.html",
  styleUrl: "./recycle-crypto.component.css",
})
export class RecycleCryptoComponent implements OnInit, OnDestroy {
  cryptoAccounts: any[] = [];
  Math = Math;
  currentRoleId: any;
  currentRole: any;
  selectedMode: string | null = null; // ye hi paymentMethod hai (ERC20/BEP20/TRC20/OMNI/SPL)

  currentPage = 1;
  pageSize = 6;

  totalElements = 0;
  totalPagesCount = 0;

  loading = false;
  viewMode: "table" | "grid" = "table";

  private modeSubscription!: Subscription;

  constructor(
    private cryptoService: CryptoService,
    private userStateService: UserStateService,
    private snack: SnackbarService,
    private currencyBehaviourService: CurrencyBehaviourService,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentRole = this.userStateService.getRole();

    this.modeSubscription = this.currencyBehaviourService.getMode().subscribe({
      next: (mode: string) => {
        if (!mode) return;
        this.selectedMode = mode.toUpperCase(); // paymentMethod API me uppercase jaata hai
        this.currentPage = 1; // mode change hone par page reset
        this.fetchDeletedCryptos();
      },
      error: (err) => {

      },
    });
  }

  ngOnDestroy(): void {
    this.modeSubscription?.unsubscribe();
  }

  setView(mode: "table" | "grid") {
    this.viewMode = mode;
  }

  fetchDeletedCryptos() {
    this.loading = true;

    const options = {
      page: this.currentPage - 1,
      size: this.pageSize,
    };

    this.cryptoService
      .getDeletedCrypto(
        this.currentRoleId,
        this.currentRole,
        this.selectedMode,
        options,
      )
      .subscribe({
        next: (res: any) => {
          this.loading = false;

          // res khud array ho sakta hai, ya { content, totalElements, totalPages } wala object
          if (Array.isArray(res)) {
            this.cryptoAccounts = res;
            this.totalElements = res.length;
            this.totalPagesCount = Math.ceil(res.length / this.pageSize) || 1;
          } else {
            this.cryptoAccounts = res?.content || [];
            this.totalElements = res?.totalElements || 0;
            this.totalPagesCount = res?.totalPages || 0;
          }
        },
        error: (err) => {
          this.loading = false;
        },
      });
  }

  // NOTE: deleteCrypto API PATCH /crypto/toggleDeleted/:id
  reactivateCrypto(cryptoId: string) {
    const data = { isDeleted: false };

    this.cryptoService.deleteCrypto(cryptoId, data).subscribe({
      next: () => {
        this.snack.show("Crypto reactivated successfully!", true);
        this.fetchDeletedCryptos();
      },
      error: () => {
        this.snack.show("Failed to reactivate crypto", false);
      },
    });
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchDeletedCryptos();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPagesCount) {
      this.currentPage++;
      this.fetchDeletedCryptos();
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
      this.fetchDeletedCryptos();
    }
  }
}
