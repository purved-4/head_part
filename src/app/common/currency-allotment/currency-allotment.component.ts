import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from "@angular/core";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ChiefService } from "../../pages/services/chief.service";
import { ComPartService } from "../../pages/services/com-part.service";
import { PortalService } from "../../pages/services/portal.service";
import { DateTimeUtil } from "../../utils/date-time.utils";
import { UserStateService } from "../../store/user-state.service";
import { TimeZoneServiceService } from "../time-zone/time-zone-service.service";

type RateStatus = "expired" | "active" | "upcoming";

interface CurrencyRateItem {
  id: string;
  rate: number;
  effectiveFrom: string;
  status?: RateStatus;
}

interface CurrencyData {
  currencyId: string;
  rate: number;
  effectiveFrom: string | null;
  currencyRates: CurrencyRateItem[];
}

@Component({
  selector: "app-currency-allotment",
  templateUrl: "./currency-allotment.component.html",
  styleUrl: "./currency-allotment.component.css",
})
export class CurrencyAllotmentComponent implements OnInit, OnDestroy {
  DateTimeUtil = DateTimeUtil;
  entityId: any;
  entityType: any;
  @Output() close = new EventEmitter<void>();

  CURRENCIES = ["INR", "USD", "USDT"] as const;
  currencies = [...this.CURRENCIES];

  selectedCurrency: string | null = null;
  rate: number | null = null;
  effectiveFromNew: any;

  isPortalCurrencyLoaded: boolean = false;

  existingData: Record<string, CurrencyData | null> = {
    INR: null,
    USD: null,
    USDT: null,
  };

  currentRole: any;
  showEditModal: boolean = false;
  editingCurrencyId: string = "";
  editingRateId: string = "";
  editingRate: number | null = null;

  // ================= ACCESS CONTROL =================
  // false aane par form completely locked ho jayega
  isEdited: boolean = true;
  get isLocked(): boolean {
    return this.isEdited === false;
  }

  // ================= LIVE CLOCK =================
  now: Date = new Date();
  minDateTime: string = "";
  private clockTimer: any;

  // ---- effectiveFrom ke andar chalne wala live preview timer ----
  // jab tak user manually select nahi karta, ye "now" ke sath tick karta hai.
  // select karte hi wahi date/time anchor ban jata hai aur usi se aage tick karta hai.
  effectivePreviewLabel: string = "";
  private previewAnchorValue: number = Date.now();
  private previewAnchorReal: number = Date.now();

  // ================= TABLE FILTER =================
  tableFilterCurrency: string = "ALL";

  constructor(
    private snackBar: SnackbarService,
    private chiefService: ChiefService,
    private comPartService: ComPartService,
    private portalService: PortalService,
    private userStateService: UserStateService,
    private tzService: TimeZoneServiceService,
  ) {}

  ngOnInit(): void {
    this.startLiveClock();

    this.entityId = this.userStateService.getCurrentEntityId();
    this.currentRole = this.userStateService.getRole();
    this.entityType = this.currentRole;

    if (this.entityType === "CHIEF") {
      this.loadCurrencies();
    } else if (this.entityType === "COM_PART") {
      this.loadComPartCurrencies();
    } else if (this.entityType === "PORTAL") {
      this.loadPortalCurrencies();
    }
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }

  // ================= LIVE CLOCK LOGIC =================
  private startLiveClock() {
    this.updateClock();
    // ticks every second -> "live" feel, min date and status auto refresh
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }

  private updateClock() {
    this.now = new Date();

    // effectiveFrom ke liye min datetime -> current time + 2 min buffer
    const buffered = new Date(this.now.getTime() + 2 * 60 * 1000);
    buffered.setMinutes(buffered.getMinutes() - buffered.getTimezoneOffset());
    const formattedMin = buffered.toISOString().slice(0, 16);
    this.minDateTime = formattedMin;

    if (!this.effectiveFromNew) {
      this.effectiveFromNew = formattedMin;
      this.previewAnchorValue = new Date(formattedMin).getTime();
      this.previewAnchorReal = Date.now();
    }

    this.tickPreviewClock();

    // agar sirf history hai (koi form input nahi), toh statuses bhi live refresh karo
    this.refreshAllStatuses();
  }

  // effectiveFrom field ke andar chalne wala live ticking preview
  private tickPreviewClock() {
    const elapsedSinceAnchor = Date.now() - this.previewAnchorReal;
    const previewTs = this.previewAnchorValue + elapsedSinceAnchor;
    this.effectivePreviewLabel = this.formatInTz(previewTs);
  }

  // user ne field me manually date/time select kiya -> yahi se timer restart hoga
  onEffectiveFromChange() {
    if (!this.effectiveFromNew) return;

    const picked = new Date(this.effectiveFromNew).getTime();
    if (isNaN(picked)) return;

    this.previewAnchorValue = picked;
    this.previewAnchorReal = Date.now();
    this.tickPreviewClock();
  }

  private formatInTz(ts: number): string {
    const timeZone = this.tzService.getActiveTimeZone();
    return new Intl.DateTimeFormat("en-IN", {
      timeZone,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date(ts));
  }

  // kept for backward compat with (focus) handler in template
  updateMinDateTime() {
    this.updateClock();
  }

  // ================= LOAD DATA =================
  loadCurrencies() {
    this.chiefService.getCurrencies(this.entityId).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res)
          ? res
          : res?.data?.currencies || res?.data || [];
        this.loadExistingData(data);
        this.snackBar.show(res.message || "Data fetched successfully", true);
        this.setDefaultSelection();
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
        // isEdited backend se root level ya data ke andar dono jagah aa sakta hai
        this.isEdited = res?.data?.isEdited ?? res?.isEdited ?? true;

        const currenciesBlock = res?.data?.currencies ?? res?.currencies ?? [];
        const data = Array.isArray(currenciesBlock)
          ? currenciesBlock
          : currenciesBlock?.data || [];

        this.loadExistingData(data);
        this.snackBar.show(res.message || "Data fetched successfully", true);
        this.setDefaultSelection();
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
        this.setDefaultSelection();
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
    const selected =
      this.CURRENCIES.find((currency) => this.existingData[currency]) ??
      this.CURRENCIES[0];
    this.selectCurrency(selected);
  }

  loadExistingData(apiData: any[]) {
    this.existingData = { INR: null, USD: null, USDT: null };

    apiData.forEach((item: any) => {
      const sortedRates: CurrencyRateItem[] = (item.currencyRates || [])
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(a.effectiveFrom).getTime() -
            new Date(b.effectiveFrom).getTime(),
        );

      this.existingData[item.currency] = {
        currencyId: item.currencyId,
        rate: item.rate,
        effectiveFrom: item.effectiveFrom,
        currencyRates: this.applyStatuses(sortedRates),
      };
    });
  }
  private applyStatuses(rates: CurrencyRateItem[]): CurrencyRateItem[] {
    const nowTs = this.getZonedNow();

    let activeIndex = -1;
    rates.forEach((r, idx) => {
      if (new Date(r.effectiveFrom).getTime() <= nowTs) {
        activeIndex = idx;
      }
    });

    return rates.map((r, idx) => {
      let status: RateStatus;
      if (idx < activeIndex) status = "expired";
      else if (idx === activeIndex) status = "active";
      else status = "upcoming";
      return { ...r, status };
    });
  }

  private refreshAllStatuses() {
    Object.keys(this.existingData).forEach((key) => {
      const entry = this.existingData[key];
      if (entry && entry.currencyRates?.length) {
        entry.currencyRates = this.applyStatuses(entry.currencyRates);
      }
    });
  }

  private getZonedNow(): number {
    const timeZone = this.tzService.getActiveTimeZone();
    return new Date(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date()),
    ).getTime();
  }

  // ================= CURRENCY SELECTION =================
  selectCurrency(currency: string) {
    if (this.isLocked) return;

    this.selectedCurrency = currency;
    const existing = this.existingData[currency];
    this.rate = existing ? existing.rate : null;
  }

  clearSelection() {
    if (this.isLocked) return;
    this.selectedCurrency = null;
    this.rate = null;
  }

  getExistingDataForCurrency(currency: string | null): CurrencyData | null {
    if (!currency) return null;
    return this.existingData[currency];
  }

  // ================= TABLE ROWS (currency-filtered, client-side) =================
  // "ALL" -> saari currencies ka combined data (ascending order me, current currency tag ke sath)
  // specific currency -> sirf usi ka data
  get tableRows(): Array<
    CurrencyRateItem & { currency: string; currencyId: string }
  > {
    const rows: Array<
      CurrencyRateItem & { currency: string; currencyId: string }
    > = [];

    const keys =
      this.tableFilterCurrency === "ALL"
        ? this.CURRENCIES
        : [this.tableFilterCurrency];

    keys.forEach((cur) => {
      const entry = this.existingData[cur];
      if (entry?.currencyRates?.length) {
        entry.currencyRates.forEach((r) => {
          rows.push({ ...r, currency: cur, currencyId: entry.currencyId });
        });
      }
    });

    // past upar, future neeche -> ascending order
    rows.sort(
      (a, b) =>
        new Date(a.effectiveFrom).getTime() -
        new Date(b.effectiveFrom).getTime(),
    );

    return rows;
  }

  onTableFilterChange(value: string) {
    this.tableFilterCurrency = value;
  }

  // ================= SUBMIT =================
  submit() {
    if (this.isLocked) {
      this.snackBar.show("You don't have access to edit currency rates", false);
      return;
    }

    if (!this.selectedCurrency) {
      this.snackBar.show("Please select a currency", false);
      return;
    }

    this.updateClock();

    const selectedDate = new Date(this.effectiveFromNew).getTime();
    const currentMinDate = new Date(this.minDateTime).getTime();

    if (this.entityType !== "PORTAL" && selectedDate < currentMinDate) {
      this.snackBar.show("Effective From must be in the future", false);
      return;
    }

    let payload: any;

    if (this.entityType === "PORTAL") {
      payload = { currency: this.selectedCurrency };
    } else if (this.entityType === "COM_PART" || this.entityType === "OWNER") {
      payload = [
        {
          currency: this.selectedCurrency,
          rate: this.rate,
          effectiveFrom: new Date(this.effectiveFromNew).toISOString(),
        },
      ];
    } else {
      payload = { currency: this.selectedCurrency, rate: this.rate };
    }

    let submitObservable;

    if (this.entityType === "CHIEF") {
      submitObservable = this.chiefService.saveCurrencies(
        this.entityId,
        payload,
      );
    } else if (this.entityType === "COM_PART") {
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

    submitObservable.subscribe({
      next: (res: any) => {
        this.snackBar.show(res?.message || "Updated successfully", true);

        const responseData = res?.data || res;
        const key = this.selectedCurrency as string;

        const sortedRates = (responseData.currencyRates || [])
          .slice()
          .sort(
            (a: any, b: any) =>
              new Date(a.effectiveFrom).getTime() -
              new Date(b.effectiveFrom).getTime(),
          );

        this.existingData[key] = {
          currencyId: responseData.currencyId,
          rate: responseData.rate,
          effectiveFrom: responseData.effectiveFrom,
          currencyRates: this.applyStatuses(sortedRates),
        };

        this.loadComPartCurrencies();
        // this.selectCurrency(this.selectedCurrency!);
      },
      error: (err: any) => {
        this.snackBar.show(err?.error?.message || "Update failed", false);
      },
    });
  }

  closeModal() {
    this.close.emit();
  }

  deleteRate(currencyId: string, rateId: string) {
    if (this.isLocked) {
      this.snackBar.show("You don't have access to delete rates", false);
      return;
    }

    this.comPartService
      .deleteCurrencyRate(this.entityId, rateId, currencyId)
      .subscribe({
        next: (res: any) => {
          this.snackBar.show(res?.message || "Rate deleted successfully", true);
          this.loadComPartCurrencies();
        },
        error: (err: any) => {
          this.snackBar.show(err?.error?.message || "Delete failed", false);
        },
      });
  }

  editRate(currencyId: string, rateId: string, currentRate: number) {
    if (this.isLocked) {
      this.snackBar.show("You don't have access to edit rates", false);
      return;
    }

    this.editingCurrencyId = currencyId;
    this.editingRateId = rateId;
    this.editingRate = currentRate;
    this.showEditModal = true;
  }

  updateRate() {
    if (this.isLocked) {
      this.snackBar.show("You don't have access to edit rates", false);
      this.showEditModal = false;
      return;
    }

    if (this.editingRate === null || this.editingRate <= 0) {
      this.snackBar.show("Please enter valid rate", false);
      return;
    }

    this.comPartService
      .updateCurrencyRate(
        this.entityId,
        this.editingRateId,
        this.editingCurrencyId,
        Number(this.editingRate),
      )
      .subscribe({
        next: (res: any) => {
          this.snackBar.show(res?.message || "Rate updated successfully", true);
          this.showEditModal = false;
          this.loadComPartCurrencies();
        },
        error: (err: any) => {
          this.snackBar.show(err?.error?.message || "Update failed", false);
        },
      });
  }

  isPastDate(date: string): boolean {
    if (!date) return false;

    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) return false;

    const timeZone = this.tzService.getActiveTimeZone();

    const nowInTz = new Date(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date()),
    );

    const inputInTz = new Date(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(inputDate),
    );

    return inputInTz.getTime() < nowInTz.getTime();
  }
}
