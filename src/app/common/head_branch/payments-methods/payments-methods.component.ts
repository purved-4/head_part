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
  selectedMode: string = "";
  @Input() showAllOption = false;

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

    // Inventory route se ALL option enable hoga
    this.showAllOption = this.router.url.includes("/inventory-management");

    // Route change ke baad bhi ALL option maintain rahe
    this.route.queryParams.subscribe((params) => {
      if (params["inventory"] === "true") {
        this.showAllOption = true;
      }
    });

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

          const queryParams = this.route.snapshot.queryParams;
          const urlCurrency = queryParams["currency"];
          const urlMode = (
            queryParams["mode"] || queryParams["paymentMethod"]
          )?.toLowerCase();

          // =============================
          // INVENTORY INITIAL LOAD
          // =============================
          if (this.showAllOption && !urlCurrency) {
            this.selectedCurrency = {
              currency: "ALL",
              modes: {},
            };

            // Duplicate ALL se bachne ke liye
            this.availableModes = [];

            this.selectedMode = "ALL";

            this.currencyBehaviourService.setCurrency(this.selectedCurrency);
            this.currencyBehaviourService.setMode(this.selectedMode);

            return;
          }

          // =============================
          // NORMAL CURRENCY FLOW
          // =============================

          const matchedCurrency = urlCurrency
            ? this.currencies.find((c) => c.currency === urlCurrency)
            : null;
          if (!matchedCurrency && urlCurrency) {
            this.selectedCurrency = {
              currency: urlCurrency,
              modes: {},
            };

            if (urlCurrency === "ALL") {
              this.availableModes = [];
              this.selectedMode = "ALL";
            } else {
              this.availableModes = urlMode ? [urlMode] : [];
              this.selectedMode = urlMode || "";
            }

            this.currencyBehaviourService.setCurrency(this.selectedCurrency);
            this.currencyBehaviourService.setMode(this.selectedMode);

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
    if (currencyValue === "ALL") {
      this.selectedCurrency = {
        currency: "ALL",
        modes: {},
      };

      // Duplicate ALL se bachne ke liye
      this.availableModes = [];

      this.selectedMode = "ALL";

      this.currencyBehaviourService.setCurrency(this.selectedCurrency);
      this.currencyBehaviourService.setMode(this.selectedMode);

      this.navigateToMode();

      return;
    }

    this.selectedCurrency = this.currencies.find(
      (c) => c.currency === currencyValue,
    ) || {
      currency: currencyValue,
      modes: {},
    };

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

  // navigateToMode() {
  //   if (this.disableRouting) {
  //     return;
  //   }
  //   if (!this.selectedCurrency || !this.selectedMode) return;

  //   const basePath =
  //     this.role === "BRANCH"
  //       ? "/branch"
  //       : this.role === "HEAD"
  //         ? "/head"
  //         : null;
  //   if (!basePath) return;

  //   if (this.isCryptoMode()) {
  //     this.router.navigate([`${basePath}/crypto`], {
  //       queryParams: {
  //         currency: this.selectedCurrency.currency,
  //         paymentMethod: this.selectedMode.toUpperCase(),
  //         mode: null,
  //       },
  //       queryParamsHandling: "merge",
  //     });
  //     return;
  //   }

  //   this.router.navigate([`${basePath}/${this.selectedMode}`], {
  //     queryParams: {
  //       currency: this.selectedCurrency.currency,
  //       mode: this.selectedMode,
  //       paymentMethod: null,
  //     },
  //     queryParamsHandling: "merge",
  //   });
  // }
  navigateToMode() {
    if (this.disableRouting) {
      return;
    }

    if (!this.selectedCurrency || !this.selectedMode) {
      return;
    }

    const basePath =
      this.role === "BRANCH"
        ? "/branch"
        : this.role === "HEAD"
          ? "/head"
          : null;

    if (!basePath) {
      return;
    }

    const queryParams: any = {
      currency: this.selectedCurrency.currency,

      // inventory se aaya hai to hamesha carry karo
      inventory: this.showAllOption ? "true" : null,
    };

    // =============================
    // ALL MODE
    // =============================

    if (this.selectedMode === "ALL") {
      this.router.navigate([`${basePath}/inventory-management`], {
        queryParams: {
          ...queryParams,
          currency: "ALL",
          mode: "ALL",
        },

        queryParamsHandling: "merge",
      });

      return;
    }

    // =============================
    // CRYPTO
    // =============================

    if (this.isCryptoMode()) {
      this.router.navigate([`${basePath}/crypto`], {
        queryParams: {
          ...queryParams,

          paymentMethod: this.selectedMode.toUpperCase(),

          mode: null,
        },

        queryParamsHandling: "merge",
      });

      return;
    }

    // =============================
    // BANK / UPI / QR
    // =============================

    this.router.navigate([`${basePath}/${this.selectedMode}`], {
      queryParams: {
        ...queryParams,

        mode: this.selectedMode,

        paymentMethod: null,
      },

      queryParamsHandling: "merge",
    });
  }
  isCurrencyInList(): boolean {
    if (!this.selectedCurrency) return false;

    // Inventory me ALL option already alag se show ho raha hai,
    // isliye isko duplicate mat dikhao.
    if (this.selectedCurrency.currency === "ALL") {
      return true;
    }

    return this.currencies.some(
      (c) => c.currency === this.selectedCurrency.currency,
    );
  }
}
