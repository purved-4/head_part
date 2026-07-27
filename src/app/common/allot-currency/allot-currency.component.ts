import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ChiefService } from "../../pages/services/chief.service";
import { ComPartService } from "../../pages/services/com-part.service";
import { PortalService } from "../../pages/services/portal.service";
import { DateTimeUtil } from "../../utils/date-time.utils";
import { UserStateService } from "../../store/user-state.service";
import { LoaderService } from "../../pages/services/loader.service";
import {
  AVAILABLE_CURRENCIES,
  buildEmptyExistingData,
  CurrencyConfig,
  ExistingDataMap,
  getCurrency,
  getNetworks,
  PaymentNetwork,
} from "../../utils/constants";

// One row = one currency, fully self-contained (rate / modes / effective date / open state).
// Replaces the old single "selectedCurrency" model so several currencies can be
// edited and submitted together in one go.
interface CurrencyRow {
  currency: string;
  meta: CurrencyConfig | undefined;
  rate: number | null;
  selectedModes: string[];
  lockedModes: string[];
  isModesOpen: boolean;
  effectiveFromNew: any;
  existing: any | null;
}

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

  isPortalCurrencyLoaded: boolean = false;

  existingData: ExistingDataMap = buildEmptyExistingData();

  currentRole: any;
  availableCurrencies: any[] = [];

  currencyRows: CurrencyRow[] = [];

  constructor(
    private snackBar: SnackbarService,
    private chiefService: ChiefService,
    private comPartService: ComPartService,
    private portalService: PortalService,
    private userStateService: UserStateService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.currentRole = this.userStateService.getRole();

    // OWNER -> Hardcoded currencies (unchanged)
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

  loadAvailableCurrencies() {
    this.comPartService.getCurrencies(this.currentEntityID).subscribe({
      next: (res: any) => {
        const currencies = res?.currencies || [];

        this.availableCurrencies = currencies
          .map((item: any) => getCurrency(item.currency))
          .filter((c: CurrencyConfig | undefined): c is CurrencyConfig => !!c);

        this.buildRowsFromAvailableCurrencies();
      },
    });
  }

  // ================= META HELPERS =================
  getCurrencyMeta(code: string | null): CurrencyConfig | undefined {
    if (!code) return undefined;
    return this.availableCurrencies.find((c: any) => c.currency === code);
  }

  getNetworksFor(currency: string): PaymentNetwork[] {
    return this.getCurrencyMeta(currency)?.networks ?? [];
  }

  // CurrencyConfig (from constants.ts) has no modesLabel/modesHint field,
  // so this is a fixed label — adjust here if you ever want it per-currency.
  getModesLabelFor(currency: string): string {
    return "Payment Modes";
  }

  getModeIcon(currency: string, code: string): string {
    return (
      this.getNetworksFor(currency).find((n) => n.code === code)?.icon ??
      "token"
    );
  }

  getModeLabel(currency: string, code: string): string {
    return (
      this.getNetworksFor(currency).find((n) => n.code === code)?.label ?? code
    );
  }

  get usdtNetworks(): PaymentNetwork[] {
    return getNetworks("USDT");
  }

  getUsdtIcon(networkCode: string): string {
    return (
      this.usdtNetworks.find((n) => n.code === networkCode)?.icon ?? "token"
    );
  }

  // Locked state kept exactly as before: INR rate is always fixed at 1 / read-only.
  isCurrencyLocked(currency: string | null): boolean {
    return currency === "INR";
  }

  isModeLocked(row: CurrencyRow, mode: string): boolean {
    return row.lockedModes.includes(mode);
  }

  // ================= ROW BUILDING =================
  private buildRow(
    currency: string,
    meta?: CurrencyConfig,
    existing?: any,
  ): CurrencyRow {
    return {
      currency,
      meta: meta ?? this.getCurrencyMeta(currency),
      rate: currency === "INR" ? 1 : (existing?.rate ?? null),
      selectedModes: existing ? [...existing.modes] : [],
      lockedModes: [],
      isModesOpen: false,
      effectiveFromNew: existing?.effectiveFrom
        ? new Date(existing.effectiveFrom)
        : new Date(),
      existing: existing ?? null,
    };
  }

  // Used when no existing data has come back yet (e.g. first load / error branch) —
  // still lets the user configure every currency they're allowed to see.
  buildRowsFromAvailableCurrencies() {
    if (this.currencyRows.length) return;
    this.currencyRows = this.availableCurrencies.map((meta: any) =>
      this.buildRow(meta.currency, meta),
    );
  }

  // ================= LOAD DATA (unchanged endpoints / role logic) =================
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
    if (!this.currencyRows.length) {
      this.buildRowsFromAvailableCurrencies();
    }
  }

  // Loads the API's currency array into `existingData` (same as before) AND builds
  // one row per currency returned, so all of them render — and can be edited/saved —
  // at once instead of picking a single currency from a dropdown.
  //
  // NEW LOGIC: `modes` can arrive as an object map, e.g. { BANK: true, UPI: false }.
  // convertModes() below only keeps the keys whose value is exactly `true` as selected.
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

    this.currencyRows = apiData.map((item: any) => {
      const meta =
        this.getCurrencyMeta(item.currency) ?? getCurrency(item.currency);
      return this.buildRow(item.currency, meta, {
        rate: item.rate,
        modes: this.convertModes(item.modes),
        effectiveFrom: item.effectiveFrom,
      });
    });

    // Any currency the entity is allowed to configure but that has no existing
    // record yet still gets a (blank) row so it can be set up for the first time.
    this.availableCurrencies.forEach((meta: any) => {
      if (!this.currencyRows.find((r) => r.currency === meta.currency)) {
        this.currencyRows.push(this.buildRow(meta.currency, meta));
      }
    });

    if (!this.currencyRows.length) {
      this.buildRowsFromAvailableCurrencies();
    }
  }

  // NEW LOGIC: only keep mode codes whose value is strictly `true`.
  // (Array payloads are passed through unchanged, for backwards compatibility.)
  convertModes(modesObj: any): string[] {
    if (!modesObj) return [];
    if (Array.isArray(modesObj)) return modesObj;
    return Object.keys(modesObj).filter((k) => modesObj[k] === true);
  }

  getExistingDataForCurrency(currency: string | null): any {
    if (!currency) return null;
    return this.existingData[currency];
  }

  // ================= MODES MANAGEMENT =================
  toggleMode(row: CurrencyRow, mode: string) {
    if (row.lockedModes.includes(mode) && row.selectedModes.includes(mode)) {
      return;
    }

    // CurrencyConfig has no multiSelect flag in constants.ts — every currency's
    // payment modes (INR: BANK/UPI, USDT: ERC20/BEP20/TRC20/OMNI/SPL) are
    // multi-select, so a mode simply toggles on/off.
    if (row.selectedModes.includes(mode)) {
      row.selectedModes = row.selectedModes.filter((m) => m !== mode);
    } else {
      row.selectedModes.push(mode);
    }
  }

  // ================= CHANGE DETECTION (now per-row, same rules as before) =================
  rowHasChanges(row: CurrencyRow): boolean {
    if (!row.existing) {
      return (
        row.selectedModes.length > 0 ||
        (row.rate !== null && row.rate !== undefined)
      );
    }

    const modesChanged =
      row.selectedModes.length !== row.existing.modes.length ||
      !row.selectedModes.every((m: string) => row.existing.modes.includes(m));

    const rateChanged = row.rate !== row.existing.rate;

    return modesChanged || rateChanged;
  }

  hasChanges(): boolean {
    return this.currencyRows.some((row) => this.rowHasChanges(row));
  }

  // ================= SUBMIT =================
  // Only the rows that actually changed are sent, and they're sent together as an
  // array (index 0 = first changed currency, index 1 = second, ...) instead of a
  // single currency object like before.
  submit() {
    if (!this.currencyRows.length) {
      this.snackBar.show("No currencies to update", false);
      return;
    }

    const rowsToSubmit = this.currencyRows.filter((row) =>
      this.rowHasChanges(row),
    );

    if (!rowsToSubmit.length) {
      this.snackBar.show("No changes to update", false);
      return;
    }

    for (const row of rowsToSubmit) {
      // Validate rate (except INR) — same rule as before, now per row.
      if (
        this.entityType === "OWNER" &&
        row.currency !== "INR" &&
        (row.rate == null || row.rate <= 0)
      ) {
        this.snackBar.show(
          `Currency rate for ${row.currency} must be greater than 0`,
          false,
        );
        return;
      }

      // Modes validation only for CHIEF & PORTAL — same rule as before, now per row.
      if (
        (this.entityType === "CHIEF" || this.entityType === "PORTAL") &&
        row.selectedModes.length === 0
      ) {
        this.snackBar.show(
          `Please select at least one payment mode for ${row.currency}`,
          false,
        );
        return;
      }
    }

    this.loaderService.showButtonLoader();

    // ================= PAYLOAD (array — one entry per changed currency) =================
    const payload: any[] = rowsToSubmit.map((row) => {
      if (this.entityType === "PORTAL") {
        return {
          currency: row.currency,
          modes: row.selectedModes,
        };
      }

      if (this.entityType === "COM_PART" || this.entityType === "OWNER") {
        return {
          currency: row.currency,
          rate: row.rate,
          effectiveFrom: new Date(row.effectiveFromNew).toISOString(),
        };
      }

      if (this.entityType === "CHIEF") {
        return {
          currency: row.currency,
          rate: row.rate,
          modes: row.selectedModes,
        };
      }

      return null;
    });

    if (payload.some((p) => p === null)) {
      this.loaderService.hideButtonLoader();
      this.snackBar.show("Invalid entity type", false);
      return;
    }

    let submitObservable;

    // ================= API (same endpoints as before, now fed the array payload) =================
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
      this.loaderService.hideButtonLoader();
      this.snackBar.show("Invalid entity type", false);
      return;
    }

    submitObservable.subscribe({
      next: (res: any) => {
        this.loaderService.hideButtonLoader();
        this.snackBar.show(res?.message || "Updated successfully", true);

        rowsToSubmit.forEach((row) => {
          this.existingData[row.currency] = {
            rate: row.rate,
            modes: [...row.selectedModes],
            effectiveFrom: row.effectiveFromNew,
          };
          row.lockedModes = [...row.selectedModes];
          row.existing = this.existingData[row.currency];
        });

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
