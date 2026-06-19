import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { CurrencyService } from "../../../pages/services/currency.service";
import { UserStateService } from "../../../store/user-state.service";
import { PortalService } from "../../../pages/services/portal.service";
import { SnackbarService } from "../../snackbar/snackbar.service";

@Component({
  selector: "app-inventory-configuration",
  templateUrl: "./inventory-configuration.component.html",
  styleUrl: "./inventory-configuration.component.css",
})
export class InventoryConfigurationComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() refreshBankAccounts = new EventEmitter<void>();
  @Output() refreshUpis = new EventEmitter<void>();

  currentStep = 1;

  currencies: any[] = [];
  modes: any[] = [];

  selectedCurrency: any = null;
  selectedMode: any = null;

  showAddBankForm = false;

  entityId: any;
  entityType: any;

  constructor(
    private userstateService: UserStateService,
    private portalService: PortalService,
    private snackBar: SnackbarService,
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
  }

  selectMode(mode: any): void {
    this.selectedMode = mode?.toUpperCase();
    this.showAddBankForm = !!mode;
  }
  onBankFormSubmitted(): void {
    this.close.emit();
  }
  onUpiSubmitted(event: any) {

    this.showAddBankForm = false;
  }

  onUpiCancelled() {
    this.showAddBankForm = false;
  }

  onBankAdded() {
    this.refreshBankAccounts.emit();
    this.close.emit();
  }

  onUpiAdded() {
    this.refreshUpis.emit();
    this.close.emit();
  }
}
