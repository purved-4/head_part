import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { PortalService } from "../../../pages/services/portal.service";
import { UserStateService } from "../../../store/user-state.service";
import { CurrencyBehaviourService } from "./currency-behaviour.service";

// modes jo bank/upi flow ke andar aate hain — baaki sab crypto maana jayega
export const FIAT_MODES = ["bank", "upi", "qr"];

@Component({
  selector: "app-payments-methods",
  templateUrl: "./payments-methods.component.html",
  styleUrl: "./payments-methods.component.css",
})
export class PaymentsMethodsComponent implements OnInit, OnDestroy {
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
    private route: ActivatedRoute,
    private currencyBehaviourService: CurrencyBehaviourService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();
    this.loadCurrencies();
  }
  ngOnDestroy(): void {
    this.currencyBehaviourService.resetAll();
  }
  loadCurrencies() {
    this.portalService
      .getCurrenciesByEntity(this.entityId, this.role)
      .subscribe({
        next: (res: any) => {
          this.currencies = res?.data || [];

          if (!this.currencies.length) return;

          // ===== QUERY PARAMS SE CURRENT STATE NIKAALO =====
          const queryParams = this.route.snapshot.queryParams;
          const urlCurrency = queryParams["currency"];
          const urlMode = (
            queryParams["mode"] || queryParams["paymentMethod"]
          )?.toLowerCase();

          const matchedCurrency = urlCurrency
            ? this.currencies.find((c) => c.currency === urlCurrency)
            : null;

          if (!matchedCurrency && urlCurrency) {
            this.selectedCurrency = { currency: urlCurrency, modes: {} };
            this.availableModes = urlMode ? [urlMode] : [];
            this.selectedMode = urlMode || "";

            this.currencyBehaviourService.setCurrency(this.selectedCurrency);
            this.currencyBehaviourService.setMode(this.selectedMode);
            // URL already sahi hai (crypto flow se aaya hai), navigate mat karo
            return;
          }

          const defaultCurrency =
            matchedCurrency ||
            this.currencies.find((c) => c.currency === "INR") ||
            this.currencies[0];

          this.selectedCurrency = defaultCurrency;

          this.availableModes = Object.keys(defaultCurrency.modes)
            .filter((key) => defaultCurrency.modes[key])
            .map((m) => m.toLowerCase());

          // Pehle URL ka mode try karo, agar available hai
          if (urlMode && this.availableModes.includes(urlMode)) {
            this.selectedMode = urlMode;
          } else if (this.availableModes.includes("bank")) {
            this.selectedMode = "bank";
          } else {
            this.selectedMode = this.availableModes[0] || "";
          }

          this.currencyBehaviourService.setCurrency(this.selectedCurrency);
          this.currencyBehaviourService.setMode(this.selectedMode);

          if (!this.isUrlAlreadyCorrect(urlCurrency, urlMode)) {
            this.navigateToMode();
          }
        },
      });
  }

  private isUrlAlreadyCorrect(
    urlCurrency: string | undefined,
    urlMode: string | undefined,
  ): boolean {
    if (!this.selectedCurrency || !this.selectedMode) return false;
    return (
      urlCurrency === this.selectedCurrency.currency &&
      urlMode === this.selectedMode.toLowerCase()
    );
  }

  onCurrencyChange(currencyValue: string) {
    this.selectedCurrency = this.currencies.find(
      (c) => c.currency === currencyValue,
    ) || { currency: currencyValue, modes: {} };

    if (!this.selectedCurrency) return;

    this.availableModes = Object.keys(this.selectedCurrency.modes)
      .filter((key) => this.selectedCurrency.modes[key])
      .map((m) => m.toLowerCase());

    if (!this.availableModes.includes(this.selectedMode)) {
      if (this.availableModes.includes("bank")) {
        this.selectedMode = "bank";
      } else {
        this.selectedMode = this.availableModes[0] || "";
      }
    }

    this.currencyBehaviourService.setCurrency(this.selectedCurrency);
    this.currencyBehaviourService.setMode(this.selectedMode);

    this.navigateToMode();
  }

  onModeChange(event: Event) {
    this.selectedMode = (event.target as HTMLSelectElement).value;
    this.currencyBehaviourService.setMode(this.selectedMode);
    this.navigateToMode();
  }

  private isCryptoMode(): boolean {
    return !FIAT_MODES.includes((this.selectedMode || "").toLowerCase());
  }

  navigateToMode() {
    if (this.disableRouting) {
      return;
    }
    if (!this.selectedCurrency || !this.selectedMode) return;

    const basePath =
      this.role === "BRANCH"
        ? "/branch"
        : this.role === "HEAD"
          ? "/head"
          : null;
    if (!basePath) return;

    if (this.isCryptoMode()) {
      this.router.navigate([`${basePath}/crypto`], {
        queryParams: {
          currency: this.selectedCurrency.currency,
          paymentMethod: this.selectedMode.toUpperCase(),
          mode: null,
        },
        queryParamsHandling: "merge",
      });
      return;
    }

    this.router.navigate([`${basePath}/${this.selectedMode}`], {
      queryParams: {
        currency: this.selectedCurrency.currency,
        mode: this.selectedMode,
        paymentMethod: null,
      },
      queryParamsHandling: "merge",
    });
  }
  isCurrencyInList(): boolean {
    if (!this.selectedCurrency) return false;
    return this.currencies.some(
      (c) => c.currency === this.selectedCurrency.currency,
    );
  }
}
