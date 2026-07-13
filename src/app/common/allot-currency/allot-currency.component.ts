import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ChiefService } from "../../pages/services/chief.service";
import { ComPartService } from "../../pages/services/com-part.service";
import { PortalService } from "../../pages/services/portal.service";
import { DateTimeUtil } from "../../utils/date-time.utils";
import { UserStateService } from "../../store/user-state.service";
import { LoaderService } from "../../pages/services/loader.service";
// import { AVAILABLE_CURRENCIES, buildEmptyExistingData, CurrencyConfig, ExistingDataMap, getNetworks, PaymentNetwork } from "../../utils/constants";
import {
  AVAILABLE_CURRENCIES,
  buildEmptyExistingData,
  CurrencyConfig,
  ExistingDataMap,
  getCurrency,
  getNetworks,
  PaymentNetwork,
} from "../../utils/constants";
@Component({
  selector: "app-allot-currency",
  templateUrl: "./allot-currency.component.html",
})
export class AllotCurrencyComponent implements OnInit {
  DateTimeUtil = DateTimeUtil;
  @Input() entityId: any;
  @Input() entityType: any;
  @Input() currentEntityID: any;
  @Output() close = new EventEmitter<void>();

  effectiveFrom: any = null;
  selectedCurrency: any;

  selectedModes: string[] = [];
  lockedModes: string[] = [];
  rate: number | null = null;

  isPortalCurrencyLoaded: boolean = false;

  // Existing data
  existingData: ExistingDataMap = buildEmptyExistingData();

  effectiveFromNew: any;
  currentRole: any;
  availableCurrencies: any = [];

  isModesOpen = false;

  get currentNetworks(): PaymentNetwork[] {
    return this.getCurrencyMeta(this.selectedCurrency)?.networks ?? [];
  }

  get currentModesLabel(): string {
    return (
      this.getCurrencyMeta(this.selectedCurrency)?.modesLabel ?? "Payment Modes"
    );
  }

  get currentModesHint(): string | undefined {
    return this.getCurrencyMeta(this.selectedCurrency)?.modesHint;
  }

  getModeIcon(code: string): string {
    return this.currentNetworks.find((n) => n.code === code)?.icon ?? "token";
  }

  getModeLabel(code: string): string {
    return this.currentNetworks.find((n) => n.code === code)?.label ?? code;
  }

  get usdtNetworks(): PaymentNetwork[] {
    return getNetworks("USDT");
  }

  getCurrencyMeta(code: string | null): any | undefined {
    if (!code) return undefined;
    return this.availableCurrencies.find((c: any) => c.currency === code);
  }

  getUsdtIcon(networkCode: string): string {
    return (
      this.usdtNetworks.find((n) => n.code === networkCode)?.icon ?? "token"
    );
  }

  constructor(
    private snackBar: SnackbarService,
    private chiefService: ChiefService,
    private comPartService: ComPartService,
    private portalService: PortalService,
    private userStateService: UserStateService,
    private loaderService: LoaderService,
  ) {
    this.effectiveFromNew = new Date();
  }

  // ngOnInit(): void {
  //   this.currentRole = this.userStateService.getRole();
  //   if (this.entityType === "CHIEF") {
  //     this.loadCurrencies();
  //   } else if (this.entityType === "COM_PART") {
  //     this.loadComPartCurrencies();
  //   } else if (this.entityType === "PORTAL") {
  //     this.loadPortalCurrencies();
  //   }
  // }
  ngOnInit(): void {
    this.currentRole = this.userStateService.getRole();

    // OWNER -> Hardcoded currencies
    if (this.currentRole === "OWNER") {
      this.availableCurrencies = AVAILABLE_CURRENCIES;
    } else {
      this.loadAvailableCurrencies();
    }

    if (this.entityType === "CHIEF") {
      this.loadCurrencies();
    } else if (this.entityType === "COM_PART") {
      this.loadComPartCurrencies();
    } else if (this.entityType === "PORTAL") {
      this.loadPortalCurrencies();
    }
  }

  // loadAvailableCurrencies() {
  //   this.comPartService.getCurrencies(this.currentEntityID).subscribe({
  //     next: (res: any) => {
  //       const currencies = res?.currencies || [];

  //       this.availableCurrencies = currencies
  //         .map((item: any) => this.getCurrencyMeta(item.currency))
  //         .filter((c: CurrencyConfig | undefined): c is CurrencyConfig => !!c);
  //     },
  //   });
  // }
  loadAvailableCurrencies() {
    this.comPartService.getCurrencies(this.currentEntityID).subscribe({
      next: (res: any) => {
        const currencies = res?.currencies || [];

        this.availableCurrencies = currencies
          .map((item: any) => getCurrency(item.currency))
          .filter((c: CurrencyConfig | undefined): c is CurrencyConfig => !!c);
      },
    });
  }

  // ================= LOCK STATE =================
  hasChanges(): boolean {
    if (!this.selectedCurrency) return false;

    const existing =
      this.existingData[
        this.selectedCurrency as keyof typeof this.existingData
      ];

    // No existing data yet -> any selection counts as a change worth submitting
    if (!existing) {
      return (
        this.selectedModes.length > 0 ||
        (this.rate !== null && this.rate !== undefined)
      );
    }

    const modesChanged =
      this.selectedModes.length !== existing.modes.length ||
      !this.selectedModes.every((m) => existing.modes.includes(m));

    const rateChanged = this.rate !== existing.rate;

    return modesChanged || rateChanged;
  }
  // Returns true when this currency's data already exists (fetched from API)
  // — in that case its rate/modes must be read-only in the UI.
  // isCurrencyLocked(currency: string | null): boolean {
  //   if (!currency) return false;
  //   return !!this.existingData[currency];
  // }
  isCurrencyLocked(currency: string | null): boolean {
    return currency === "INR";
  }

  isModeLocked(mode: string): boolean {
    return this.lockedModes.includes(mode);
  }

  // ================= LOAD DATA =================

  // getCurrencyMeta(currency: string | null) {
  //   return this.availableCurrencies.find((c) => c.currency === currency);
  // }

  // loadCurrencies() {
  //   this.chiefService.getCurrencies(this.entityId).subscribe({
  //     next: (res: any) => {
  //       const data = Array.isArray(res) ? res : res?.data || [];
  //       this.loadExistingData(data);
  //       this.snackBar.show(res.message || "Data fetched successfully", true);
  //       this.setDefaultSelection();
  //     },
  //     error: (err) => {
  //       this.snackBar.show(
  //         err.error?.message || "No existing data found",
  //         false,
  //       );
  //       this.setDefaultSelection();
  //     },
  //   });
  // }
  loadCurrencies() {
    this.chiefService.getCurrencies(this.entityId).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        this.loadExistingData(data);
        this.snackBar.show(res.message || "Data fetched successfully", true);
      },
      error: (err) => {
        this.snackBar.show(
          err.error?.message || "No existing data found",
          false,
        );
        this.setDefaultSelection();
      },
    });
  }

  // loadComPartCurrencies() {
  //   this.comPartService.getCurrencies(this.entityId).subscribe({
  //     next: (res: any) => {
  //       const cs = res.currencies;
  //       const data = Array.isArray(cs) ? cs : cs?.data || [];
  //       this.loadExistingData(data);
  //       this.snackBar.show(res.message || "Data fetched successfully", true);
  //       this.setDefaultSelection();
  //     },
  //     error: (err) => {
  //       this.snackBar.show(
  //         err.error?.message || "No existing data found",
  //         false,
  //       );
  //       this.setDefaultSelection();
  //     },
  //   });
  // }

  loadComPartCurrencies() {
    this.comPartService.getCurrencies(this.entityId).subscribe({
      next: (res: any) => {
        const cs = res.currencies;
        const data = Array.isArray(cs) ? cs : cs?.data || [];
        this.loadExistingData(data);
        this.snackBar.show(res.message || "Data fetched successfully", true);
      },
      error: (err) => {
        this.snackBar.show(
          err.error?.message || "No existing data found",
          false,
        );
        this.setDefaultSelection();
      },
    });
  }

  // loadPortalCurrencies() {
  //   this.portalService.getCurrenciesbyPortal(this.entityId).subscribe({
  //     next: (res: any) => {
  //       const data = Array.isArray(res) ? res : res?.data || [];
  //       this.isPortalCurrencyLoaded = true;
  //       this.loadExistingData(data);
  //       this.snackBar.show(res.message || "Portal currencies fetched", true);
  //       this.setDefaultSelection();
  //     },
  //     error: (err) => {
  //       this.isPortalCurrencyLoaded = true;
  //       this.snackBar.show(
  //         err.error?.message || "No portal currency data found",
  //         false,
  //       );
  //       this.setDefaultSelection();
  //     },
  //   });
  // }

  loadPortalCurrencies() {
    this.portalService.getCurrenciesbyPortal(this.entityId).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        this.isPortalCurrencyLoaded = true;
        this.loadExistingData(data);
        this.snackBar.show(res.message || "Portal currencies fetched", true);
      },
      error: (err) => {
        this.isPortalCurrencyLoaded = true;
        this.snackBar.show(
          err.error?.message || "No portal currency data found",
          false,
        );
        this.setDefaultSelection();
      },
    });
  }

  setDefaultSelection() {
    this.existingData = buildEmptyExistingData();
    this.resetSelectionState();
  }

  resetSelectionState(): void {
    this.selectedCurrency = null;
    this.selectedModes = [];
    this.lockedModes = [];
    this.rate = null;
  }

  // Load existing data into store — USDT handled
  // loadExistingData(apiData: any[]) {
  //   this.existingData = buildEmptyExistingData();
  //   apiData.forEach((item: any) => {
  //     if (this.existingData.hasOwnProperty(item.currency)) {
  //       this.existingData[item.currency] = {
  //         rate: item.rate,
  //         effectiveFrom: item.effectiveFrom,
  //         modes: this.convertModes(item.modes),
  //       };
  //     }
  //   });
  // }
  loadExistingData(apiData: any[]) {
    this.existingData = buildEmptyExistingData();
    apiData.forEach((item: any) => {
      if (this.existingData.hasOwnProperty(item.currency)) {
        this.existingData[item.currency] = {
          rate: item.rate,
          effectiveFrom: item.effectiveFrom,
          modes: this.convertModes(item.modes),
        };
      }
    });

    const existingCurrency = Object.keys(this.existingData).find(
      (code) => !!this.existingData[code],
    );
    if (existingCurrency) {
      this.selectCurrency(existingCurrency);
    } else {
      this.resetSelectionState();
    }
  }

  convertModes(modesObj: any): string[] {
    if (!modesObj) return [];
    if (Array.isArray(modesObj)) return modesObj;
    return Object.keys(modesObj).filter((k) => modesObj[k]);
  }

  // ================= CURRENCY SELECTION =================
  // selectCurrency(currency: string) {
  //   this.selectedCurrency = currency;
  //   this.isModesOpen = false; // close any open dropdown from the previous currency

  //   const existing = this.existingData[currency];
  //   if (existing) {
  //     this.selectedModes = [...existing.modes];
  //     this.lockedModes = [...existing.modes];
  //     this.rate = existing.rate;
  //   } else {
  //     this.selectedModes = [];
  //     this.lockedModes = [];
  //     this.rate = null;
  //   }
  // }
  selectCurrency(currency: string) {
    this.selectedCurrency = currency;
    this.isModesOpen = false;

    const existing = this.existingData[currency];

    if (existing) {
      this.selectedModes = [...existing.modes];
      this.lockedModes = [];
      this.rate = currency === "INR" ? 1 : existing.rate;
    } else {
      this.selectedModes = [];
      this.lockedModes = [];
      this.rate = currency === "INR" ? 1 : null;
    }
  }

  clearSelection() {
    this.selectedCurrency = null;
    this.selectedModes = [];
    this.lockedModes = [];
  }

  getExistingDataForCurrency(currency: string | null): any {
    if (!currency) return null;
    return this.existingData[currency];
  }

  // ================= MODES MANAGEMENT =================
  toggleMode(mode: string) {
    if (this.lockedModes.includes(mode) && this.selectedModes.includes(mode)) {
      return;
    }

    const isMultiSelect =
      this.getCurrencyMeta(this.selectedCurrency)?.multiSelect !== false;

    if (this.selectedModes.includes(mode)) {
      this.selectedModes = this.selectedModes.filter((m) => m !== mode);
    } else if (isMultiSelect) {
      this.selectedModes.push(mode);
    } else {
      this.selectedModes = [mode];
    }
  }

  // ================= SUBMIT =================
  submit() {
    if (!this.selectedCurrency) {
      this.snackBar.show("Please select a currency", false);
      return;
    }

    // Validate rate (except INR)
    if (
      this.entityType === "OWNER" &&
      this.selectedCurrency !== "INR" &&
      (this.rate == null || this.rate <= 0)
    ) {
      this.snackBar.show("Currency rate must be greater than 0", false);
      return;
    }
    if (!this.hasChanges()) {
      this.snackBar.show("No changes to update", false);
      return;
    }
    // Modes validation only for CHIEF & PORTAL
    if (
      (this.entityType === "CHIEF" || this.entityType === "PORTAL") &&
      this.selectedModes.length === 0
    ) {
      this.snackBar.show("Please select at least one payment mode", false);
      return;
    }
    this.loaderService.showButtonLoader();
    let payload: any;

    // ================= PAYLOAD =================

    // PORTAL
    if (this.entityType === "PORTAL") {
      payload = {
        currency: this.selectedCurrency,
        modes: this.selectedModes,
      };
    }

    // COM_PART & OWNER
    else if (this.entityType === "COM_PART" || this.entityType === "OWNER") {
      payload = {
        currency: this.selectedCurrency,
        rate: this.rate,
        effectiveFrom: new Date(this.effectiveFromNew).toISOString(),
      };
    }

    // CHIEF
    else if (this.entityType === "CHIEF") {
      payload = {
        currency: this.selectedCurrency,
        rate: this.rate,
        modes: this.selectedModes,
      };
    }

    // INVALID
    else {
      this.snackBar.show("Invalid entity type", false);
      return;
    }

    let submitObservable;

    // ================= API =================

    if (this.entityType === "CHIEF") {
      submitObservable = this.chiefService.saveCurrencies(
        this.entityId,
        payload,
      );
    } else if (this.entityType === "COM_PART" || this.entityType === "OWNER") {
      submitObservable = this.comPartService.saveCurrencies(
        this.entityId,
        payload,
      );
    } else if (this.entityType === "PORTAL") {
      submitObservable = this.portalService.saveCurrenciesByPortal(
        this.entityId,
        payload,
      );
    } else {
      this.snackBar.show("Invalid entity type", false);
      return;
    }

    // ================= SUBSCRIBE =================

    submitObservable.subscribe({
      next: (res: any) => {
        this.loaderService.hideButtonLoader();
        this.snackBar.show(res?.message || "Updated successfully", true);

        const key = this.selectedCurrency;

        if (!this.existingData[key]) {
          this.existingData[key] = {
            rate: this.rate,
            modes: [...this.selectedModes],
            effectiveFrom: this.effectiveFrom,
          };
        } else {
          this.existingData[key]!.rate = this.rate;
          this.existingData[key]!.modes = [...this.selectedModes];
          this.existingData[key]!.effectiveFrom = this.effectiveFrom;
        }
        this.lockedModes = [...this.selectedModes];

        this.clearSelection();

        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },

      error: (err) => {
        this.loaderService.hideButtonLoader();
        this.snackBar.show(err.error?.message || "Update failed", false);
      },
    });
  }

  closeModal() {
    this.close.emit();
  }
}
