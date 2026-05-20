import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { PortalService } from "../../../pages/services/portal.service";
import { UserStateService } from "../../../store/user-state.service";
import { CurrencyBehaviourService } from "./currency-behaviour.service";

@Component({
  selector: "app-payments-methods",
  templateUrl: "./payments-methods.component.html",
  styleUrl: "./payments-methods.component.css",
})
export class PaymentsMethodsComponent implements OnInit {
  entityId: any;
  role: any;
  @Input() disableRouting: boolean = false;

  currencies: any[] = [];

  selectedCurrency: any = null;

  availableModes: string[] = [];

  selectedMode: string = "bank";

  constructor(
    private portalService: PortalService,
    private userStateService: UserStateService,
    private router: Router,
    private currencyBehaviourService: CurrencyBehaviourService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();
    this.currencyBehaviourService.setMode(this.selectedMode);
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

          // AGAR URL ME MODE HAI AUR AVAILABLE HAI
          if (currentMode && this.availableModes.includes(currentMode)) {
            this.selectedMode = currentMode;
          } else {
            // DEFAULT MODE
            if (this.availableModes.includes("bank")) {
              this.selectedMode = "bank";
            } else {
              this.selectedMode = this.availableModes[0] || "";
            }
          }

          // FINAL STATE SYNC
          this.currencyBehaviourService.setCurrency(this.selectedCurrency);
          this.currencyBehaviourService.setMode(this.selectedMode);

          // FIRST LOAD NAVIGATION
          this.navigateToMode();
        },
      });
  }

  onCurrencyChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;

    this.selectedCurrency = this.currencies.find((c) => c.currency === value);

    if (!this.selectedCurrency) return;

    // NEW AVAILABLE MODES
    this.availableModes = Object.keys(this.selectedCurrency.modes)
      .filter((key) => this.selectedCurrency.modes[key])
      .map((m) => m.toLowerCase());

    // PRESERVE PREVIOUS MODE
    if (!this.availableModes.includes(this.selectedMode)) {
      if (this.availableModes.includes("bank")) {
        this.selectedMode = "bank";
      } else {
        this.selectedMode = this.availableModes[0] || "";
      }
    }

    // UPDATE SERVICE AFTER FINAL MODE DECIDED
    this.currencyBehaviourService.setCurrency(this.selectedCurrency);
    this.currencyBehaviourService.setMode(this.selectedMode);

    this.navigateToMode();
  }

  onModeChange(event: Event) {
    this.selectedMode = (event.target as HTMLSelectElement).value;
    this.navigateToMode();
    this.currencyBehaviourService.setMode(this.selectedMode);
  }

  navigateToMode() {
    if (this.disableRouting) {
      return;
    }
    if (!this.selectedCurrency || !this.selectedMode) return;

    if (this.role === "BRANCH") {
      this.router.navigate([`/branch/${this.selectedMode}`], {
        queryParams: {
          currency: this.selectedCurrency.currency,
          mode: this.selectedMode,
        },
      });
    } else if (this.role === "HEAD") {
      this.router.navigate([`/head/${this.selectedMode}`], {
        queryParams: {
          currency: this.selectedCurrency.currency,
          mode: this.selectedMode,
        },
      });
    }
  }
}
