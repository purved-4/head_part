import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ChiefService } from "../../pages/services/chief.service";
import { ComPartService } from "../../pages/services/com-part.service";
import { PortalService } from "../../pages/services/portal.service";
import { DateTimeUtil } from "../../utils/date-time.utils";
import { UserStateService } from "../../store/user-state.service";
import { TimeZoneServiceService } from "../time-zone/time-zone-service.service";
@Component({
  selector: "app-currency-allotment",
  templateUrl: "./currency-allotment.component.html",
  styleUrl: "./currency-allotment.component.css",
})
export class CurrencyAllotmentComponent implements OnInit {
  DateTimeUtil = DateTimeUtil;
  entityId: any;
  entityType: any;
  @Output() close = new EventEmitter<void>();

  CURRENCIES = ["INR", "USD", "USDT"] as const;
  currencies = [...this.CURRENCIES];

  // Radio button selection ke liye variables
  effectiveFrom: any = null;
  selectedCurrency: string | null = null;

  rate: number | null = null;

  isPortalCurrencyLoaded: boolean = false;

  // Existing data store
  existingData: any = {
    INR: null,
    USD: null,
    USDT: null,
  };

  effectiveFromNew: any;
  currentRole: any;
  showEditModal: boolean = false;

  editingCurrencyId: string = "";

  editingRateId: string = "";
  isEdited: boolean = true;
  editingRate: number | null = null;
  minDateTime: string = "";
  constructor(
    private snackBar: SnackbarService,
    private chiefService: ChiefService,
    private comPartService: ComPartService,
    private portalService: PortalService,
    private userStateService: UserStateService,
    private tzService: TimeZoneServiceService,
  ) {
    // this.effectiveFromNew = new Date();
    // this.setMinDateTime();
  }

  ngOnInit(): void {
    this.updateMinDateTime();
    this.entityId = this.userStateService.getCurrentEntityId();

    this.currentRole = this.userStateService.getRole();

    // IMPORTANT
    this.entityType = this.currentRole;

    if (this.entityType === "CHIEF") {
      this.loadCurrencies();
    } else if (this.entityType === "COM_PART") {
      this.loadComPartCurrencies();
    } else if (this.entityType === "PORTAL") {
      this.loadPortalCurrencies();
    }
  }

  // ================= LOAD DATA =================
  loadCurrencies() {
    this.chiefService.getCurrencies(this.entityId).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        this.loadExistingData(data);
        this.snackBar.show(res.message || "Data fetched successfully", true);
        // By default INR select karo agar data hai
        this.setDefaultSelection();
      },
      error: (err) => {
        this.snackBar.show(
          err.error?.message || "No existing data found",
          false,
        );
        // Agar error hai toh bhi INR select karo (empty form ke liye)
        this.setDefaultSelection();
      },
    });
  }

  loadComPartCurrencies() {
    this.comPartService.getCurrencies(this.entityId).subscribe({
      next: (res: any) => {
        this.isEdited = res?.isEdited ?? true;

        const cs = res.currencies;
        const data = Array.isArray(cs) ? cs : cs?.data || [];
        this.loadExistingData(data);
        this.snackBar.show(res.message || "Data fetched successfully", true);

        this.setDefaultSelection();
      },
      error: (err) => {
        this.snackBar.show(
          err.error?.message || "No existing data found",
          false,
        );
        // Agar error hai toh bhi INR select karo (empty form ke liye)
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
  // Default selection set karne ka method
  setDefaultSelection() {
    const selected =
      this.CURRENCIES.find((currency) => this.existingData[currency]) ??
      this.CURRENCIES[0];

    this.selectCurrency(selected);
  }

  //   // Load existing data into store
  // loadExistingData(apiData: any[]) {

  //   this.existingData = {};

  //   apiData.forEach((item: any) => {

  //     this.existingData[item.currency] = {

  //       currencyId: item.currencyId,

  //       rate: item.rate,

  //       effectiveFrom: item.effectiveFrom,

  //       // IMPORTANT
  //       // currencyRates: item.currencyRates || [],

  //       currencyRates: (item.currencyRates || []).sort(
  //   (a: any, b: any) =>
  //     new Date(a.effectiveFrom).getTime() -
  //     new Date(b.effectiveFrom).getTime()
  // ),
  //       modes: this.convertModes(item.modes),
  //     };
  //   });

  // }
  loadExistingData(apiData: any[]) {
    this.existingData = {};

    apiData.forEach((item: any) => {
      this.existingData[item.currency] = {
        currencyId: item.currencyId,

        rate: item.rate,

        effectiveFrom: item.effectiveFrom,

        currencyRates: (item.currencyRates || []).sort(
          (a: any, b: any) =>
            new Date(a.effectiveFrom).getTime() -
            new Date(b.effectiveFrom).getTime(),
        ),
      };
    });
  }

  // ================= CURRENCY SELECTION =================
  selectCurrency(currency: string) {
    this.selectedCurrency = currency;

    const existing =
      this.existingData[currency as keyof typeof this.existingData];

    this.rate = null;

    if (existing) {
      this.rate = existing.rate;
    }
  }

  clearSelection() {
    this.selectedCurrency = null;
    this.rate = null;
  }

  getExistingDataForCurrency(currency: string | null): any {
    if (!currency) return null;
    return this.existingData[currency as keyof typeof this.existingData];
  }

  // ================= SUBMIT =================
  //   submit() {
  //     if (!this.selectedCurrency) {
  //       this.snackBar.show("Please select a currency", false);
  //       return;
  //     }

  //     if (this.entityType !== "PORTAL" && this.selectedModes.length === 0) {
  //       this.snackBar.show("Please select at least one payment mode", false);
  //       return;
  //     }

  //     let payload: any;

  // if (this.entityType === "PORTAL") {

  //   payload = {
  //     currency: this.selectedCurrency,
  //     modes: this.selectedModes,
  //   };

  // } else if (
  //   this.entityType === "COM_PART" ||
  //   this.entityType === "OWNER"
  // ) {

  //   payload = {
  //     currency: this.selectedCurrency,
  //     rate: this.rate,
  //     modes: this.selectedModes,
  //     effectiveFrom: new Date(this.effectiveFromNew).toISOString(),
  //   };

  //    console.log(payload)

  // } else {

  //   payload = {
  //     currency: this.selectedCurrency,
  //     rate: this.rate,
  //     modes: this.selectedModes,
  //   };
  // }
  // ;

  //     let submitObservable;

  //     if (this.entityType === "CHIEF") {
  //       submitObservable = this.chiefService.saveCurrencies(
  //         this.entityId,
  //         payload,
  //       );
  //     } else if (this.entityType === "COM_PART") {
  //       submitObservable = this.comPartService.saveCurrencies(
  //         this.entityId,
  //         payload,

  //       );
  //     } else if (this.entityType === "PORTAL") {
  //       submitObservable = this.portalService.saveCurrenciesByPortal(
  //         this.entityId,
  //         payload,
  //       );
  //     } else {
  //       this.snackBar.show("Invalid entity type", false);
  //       return;
  //     }

  //     submitObservable.subscribe({
  //       next: (res: any) => {
  //         this.snackBar.show(res?.message || "Updated successfully", true);

  //         const key = this.selectedCurrency as keyof typeof this.existingData;

  //         if (!this.existingData[key]) {
  //           this.existingData[key] = {
  //             rate: this.rate,
  //             modes: [...this.selectedModes],
  //             effectiveFrom: this.effectiveFrom,
  //           };
  //         } else {
  //           this.existingData[key]!.modes = [...this.selectedModes];
  //           this.existingData[key]!.effectiveFrom = this.effectiveFrom;
  //         }

  //         this.clearSelection();

  //         setTimeout(() => {
  //           this.closeModal();
  //         }, 1000);
  //       },
  //       error: (err) => {
  //         this.snackBar.show(err.error?.message || "Update failed", false);
  //       },
  //     });
  //   }

  submit() {
    if (!this.selectedCurrency) {
      this.snackBar.show("Please select a currency", false);

      return;
    }

    this.updateMinDateTime();

    const selectedDate = new Date(this.effectiveFromNew).getTime();

    const currentMinDate = new Date(this.minDateTime).getTime();

    if (this.entityType !== "PORTAL" && selectedDate < currentMinDate) {
      this.snackBar.show("EffectiveFrom must be in the future", false);

      return;
    }

    let payload: any;

    if (this.entityType === "PORTAL") {
      payload = {
        currency: this.selectedCurrency,
      };
    } else if (this.entityType === "COM_PART" || this.entityType === "OWNER") {
      payload = {
        currency: this.selectedCurrency,
        rate: this.rate,
        effectiveFrom: new Date(this.effectiveFromNew).toISOString(),
      };
    } else {
      payload = {
        currency: this.selectedCurrency,
        rate: this.rate,
      };
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

        const key = this.selectedCurrency as keyof typeof this.existingData;

        this.existingData[key] = {
          currencyId: responseData.currencyId,

          rate: responseData.rate,

          effectiveFrom: responseData.effectiveFrom,

          currencyRates: responseData.currencyRates || [],
        };

        // refresh selection
        this.selectCurrency(this.selectedCurrency!);
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
    this.editingCurrencyId = currencyId;

    this.editingRateId = rateId;

    this.editingRate = currentRate;

    this.showEditModal = true;
  }

  updateRate() {
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

    if (isNaN(inputDate.getTime())) {
      return false;
    }

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

  // setMinDateTime() {

  //   const updateMin = () => {

  //     const now = new Date();

  //     now.setMinutes(
  //       now.getMinutes() - now.getTimezoneOffset()
  //     );

  //     const formatted =
  //       now.toISOString().slice(0, 16);

  //     this.minDateTime = formatted;

  //     // only first time set default value
  //     if (!this.effectiveFromNew) {
  //       this.effectiveFromNew = formatted;
  //     }

  //     // if selected time becomes past
  //    if (
  //   this.effectiveFromNew &&
  //   this.effectiveFromNew < formatted
  // ) {

  //   this.effectiveFromNew = formatted;

  //   this.snackBar.show(
  //     "Past date/time is not allowed",
  //     false
  //   );
  // }
  //   };

  //   updateMin();

  //   setInterval(() => {
  //     updateMin();
  //   }, 1000);
  // }
  updateMinDateTime() {
    const now = new Date();

    now.setMinutes(now.getMinutes() + 2);


    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    this.minDateTime = now.toISOString().slice(0, 16);

    // default value
    if (!this.effectiveFromNew) {
      this.effectiveFromNew = this.minDateTime;
    }
  }
}
