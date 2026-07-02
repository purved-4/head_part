import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { CurrencyService } from "../../../pages/services/currency.service";
import { UserStateService } from "../../../store/user-state.service";
import { PortalService } from "../../../pages/services/portal.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";

@Component({
  selector: "app-inventory-configuration",
  templateUrl: "./inventory-configuration.component.html",
  styleUrl: "./inventory-configuration.component.css",
})
export class InventoryConfigurationComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() refreshBankAccounts = new EventEmitter<void>();
  @Output() refreshUpis = new EventEmitter<void>();
  @Output() refreshCryptoWallets = new EventEmitter<void>();

  currentStep = 1;

  currencies: any[] = [];
  modes: any[] = [];

  selectedCurrency: any = null;
  selectedMode: any = null;

  /** Single flag to show/hide the step-2 form panel */
  showForm = false;

  entityId: any;
  entityType: any;

  /** Modes that use crypto wallet components */
  private readonly cryptoModes = new Set([
    "OMNI",
    "SPL",
    "ERC20",
    "TRC20",
    "BEP20",
  ]);

  constructor(
    private userstateService: UserStateService,
    private portalService: PortalService,
    private snackBar: SnackbarService,
    private currencyBehaviour: CurrencyBehaviourService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userstateService.getCurrentEntityId();
    this.entityType = this.userstateService.getRole();
    this.loadCurrencies();
  }

  loadCurrencies(): void {
    this.portalService
      .getCurrenciesByEntity(this.entityId, this.entityType)
      .subscribe({
        next: (res: any) => {
          this.currencies = res?.data || [];
        },
        error: (err) => {
          console.error("Currency API failed:", err);
          this.snackBar.show(
            err.error.message || "Failed to load currencies. Please try again.",
            false,
          );
        },
      });
  }

  selectCurrency(currency: any): void {
    this.selectedCurrency = currency;
    this.modes = Object.keys(currency?.modes || {}).filter(
      (key) => currency.modes[key] === true,
    );
    this.selectedMode = null;
    this.showForm = false;

    // FIX: currency select hote hi behaviour service me bhi push karo,
    // warna child wallet form purani/default currency (INR) hi padhega
    this.currencyBehaviour.setCurrency(this.selectedCurrency);
  }

  selectMode(mode: any): void {
    this.selectedMode = mode?.toUpperCase();

    console.log("Setting Mode:", this.selectedMode);

    this.currencyBehaviour.setMode(this.selectedMode);

    this.showForm = !!mode;
  }
  // ─── BANK handlers ───────────────────────────────────────────
  onBankAdded(): void {
    this.refreshBankAccounts.emit();
    this.close.emit();
  }

  // ─── UPI handlers ────────────────────────────────────────────
  onUpiSubmitted(event: any): void {
    console.log("UPI Saved", event);
    this.refreshUpis.emit();
    this.showForm = false;
    this.close.emit();
  }

  onUpiCancelled(): void {
    this.showForm = false;
  }

  // ─── Crypto handlers (OMNI / SPL / ERC20 / TRC20 / BEP20) ───
  onCryptoAdded(payload: any): void {
    const finalPayload = {
      ...payload,
      currency: this.selectedCurrency?.currency,
    };
    console.log("Crypto wallet saved:", finalPayload);
    this.refreshCryptoWallets.emit();
    this.close.emit();
  }
}
