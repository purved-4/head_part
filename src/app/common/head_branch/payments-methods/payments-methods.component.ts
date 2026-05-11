import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { PortalService } from "../../../pages/services/portal.service";
import { UserStateService } from "../../../store/user-state.service";

@Component({
  selector: "app-payments-methods",
  templateUrl: "./payments-methods.component.html",
  styleUrl: "./payments-methods.component.css",
})
export class PaymentsMethodsComponent implements OnInit {
  entityId: any;
  role: any;

  currencies: any[] = [];

  selectedCurrency: any = null;

  availableModes: string[] = [];

  selectedMode: string = "bank";

  constructor(
    private portalService: PortalService,
    private userStateService: UserStateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();

    this.loadCurrencies();
  }

  loadCurrencies() {
    this.portalService
      .getCurrenciesByEntity(this.entityId, this.role)
      .subscribe({
        next: (res: any) => {
          this.currencies = res?.data || [];

          if (!this.currencies.length) return;

          // CURRENT URL
          const url = this.router.url;

          // CURRENT MODE FROM URL
          const currentMode = url.includes("/upi")
            ? "upi"
            : url.includes("/bank")
              ? "bank"
              : null;

          // DEFAULT INR
          const defaultCurrency =
            this.currencies.find((c) => c.currency === "INR") ||
            this.currencies[0];

          this.selectedCurrency = defaultCurrency;

          // AVAILABLE MODES
          this.availableModes = Object.keys(defaultCurrency.modes)
            .filter((key) => defaultCurrency.modes[key])
            .map((m) => m.toLowerCase());

          // AGAR ROUTE PE ALREADY MODE HAI
          if (currentMode && this.availableModes.includes(currentMode)) {
            this.selectedMode = currentMode;
            return;
          }

          // FIRST LOAD DEFAULT
          if (this.availableModes.includes("bank")) {
            this.selectedMode = "bank";
          } else {
            this.selectedMode = this.availableModes[0] || "";
          }

          // ONLY FIRST TIME
          this.navigateToMode();
        },
      });
  }

  onCurrencyChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;

    this.selectedCurrency = this.currencies.find((c) => c.currency === value);

    if (!this.selectedCurrency) return;

    this.availableModes = Object.keys(this.selectedCurrency.modes)
      .filter((key) => this.selectedCurrency.modes[key])
      .map((m) => m.toLowerCase());

    // RESET DEFAULT MODE
    if (this.availableModes.includes("bank")) {
      this.selectedMode = "bank";
    } else {
      this.selectedMode = this.availableModes[0] || "";
    }

    this.navigateToMode();
  }

  onModeChange(event: Event) {
    this.selectedMode = (event.target as HTMLSelectElement).value;
    this.navigateToMode();
  }

  navigateToMode() {
    if (!this.selectedCurrency || !this.selectedMode) return;

    this.router.navigate([`/head/${this.selectedMode}`], {
      queryParams: {
        currency: this.selectedCurrency.currency,
        mode: this.selectedMode,
      },
    });
  }
}
