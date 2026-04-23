import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ChiefService } from "../../pages/services/chief.service";
import { ComPartService } from "../../pages/services/com-part.service";
import { PortalService } from "../../pages/services/portal.service";

@Component({
  selector: "app-allot-currency",
  templateUrl: "./allot-currency.component.html",
})
export class AllotCurrencyComponent implements OnInit {
  @Input() entityId: any;
  @Input() entityType: any;
  @Output() close = new EventEmitter<void>();

  // Radio button selection ke liye variables
  selectedCurrency: string | null = null;
  currencyRate: number | null = null;
  selectedModes: string[] = [];
  payinRate: number | null = null;
  payoutRate: number | null = null;

  isPortalCurrencyLoaded: boolean = false;

  // Existing data store
  existingData: any = {
    INR: null,
    USD: null,
  };

  constructor(
    private snackBar: SnackbarService,
    private chiefService: ChiefService,
    private comPartService: ComPartService,
    private portalService: PortalService,
  ) {}

  ngOnInit(): void {
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
        console.log("No existing data", err);
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
        const data = Array.isArray(res) ? res : res?.data || [];
        this.loadExistingData(data);
        this.snackBar.show(res.message || "Data fetched successfully", true);

        this.setDefaultSelection();
      },
      error: (err) => {
        console.log("No existing data", err);
        this.snackBar.show(
          err.error?.message || "No existing data found",
          false,
        );
        // Agar error hai toh bhi INR select karo (empty form ke liye)
        this.setDefaultSelection();
      },
    });
  }

  // loadPortalCurrencies() {
  //   this.portalService.getCurrenciesbyPortal(this.entityId).subscribe({
  //     next: (res: any) => {
  //       const data = Array.isArray(res) ? res : res?.data || [];
  //       this.loadExistingData(data);
  //       this.snackBar.show(res.message || "Portal currencies fetched", true);

  //       this.setDefaultSelection();
  //     },
  //     error: (err) => {
  //       console.log("No existing data", err);
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

        this.setDefaultSelection();
      },
      error: (err) => {
        console.log("No existing data", err);

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
    // Pehle check karo agar INR ka data hai toh
    if (this.existingData.INR) {
      this.selectCurrency("INR");
    } else if (this.existingData.USD) {
      this.selectCurrency("USD");
    } else {
      this.selectCurrency("INR");
    }
  }

  // Load existing data into store
  loadExistingData(apiData: any[]) {
    // Reset existing data
    this.existingData = {
      INR: null,
      USD: null,
    };

    apiData.forEach((item: any) => {
      if (item.currency === "INR") {
        this.existingData.INR = {
          rate: item.rate,
          payinRate: item.payinRate,
          payoutRate: item.payoutRate,
          modes: this.convertModes(item.modes),
        };
      } else if (item.currency === "USD") {
        this.existingData.USD = {
          rate: item.rate,
          payinRate: item.payinRate,
          payoutRate: item.payoutRate,
          modes: this.convertModes(item.modes),
        };
      }
    });
  }

  convertModes(modesObj: any): string[] {
    if (!modesObj) return [];
    if (Array.isArray(modesObj)) return modesObj;
    return Object.keys(modesObj).filter((k) => modesObj[k]);
  }

  // ================= CURRENCY SELECTION =================
  selectCurrency(currency: string) {
    this.selectedCurrency = currency;

    // Load existing data if available
    const existing =
      this.existingData[currency as keyof typeof this.existingData];
    if (existing) {
      this.currencyRate = existing.rate;
      this.selectedModes = [...existing.modes];
      this.payinRate = existing.payinRate;
      this.payoutRate = existing.payoutRate;
    } else {
      this.currencyRate = null;
      this.selectedModes = [];
      this.payinRate = null;
      this.payoutRate = null;
    }
  }

  clearSelection() {
    this.selectedCurrency = null;
    this.currencyRate = null;
    this.selectedModes = [];
    this.payinRate = null;
    this.payoutRate = null;
  }

  getExistingDataForCurrency(currency: string | null): any {
    if (!currency) return null;
    return this.existingData[currency as keyof typeof this.existingData];
  }

  // ================= MODES MANAGEMENT =================
  toggleMode(mode: string) {
    if (this.selectedModes.includes(mode)) {
      this.selectedModes = this.selectedModes.filter((m) => m !== mode);
    } else {
      // For USD, only one mode allowed (QR)
      if (this.selectedCurrency === "USD") {
        this.selectedModes = [mode];
      } else {
        this.selectedModes.push(mode);
      }
    }
  }

  // ================= SUBMIT =================
  submit() {
    if (!this.selectedCurrency) {
      this.snackBar.show("Please select a currency", false);
      return;
    }

    if (this.entityType !== "PORTAL" && this.selectedModes.length === 0) {
      this.snackBar.show("Please select at least one payment mode", false);
      return;
    }

    let payload: any;

    if (this.entityType === "PORTAL") {
      payload = {
        currency: this.selectedCurrency,
        modes: this.selectedModes,
      };
    } else {
      if (!this.currencyRate) {
        this.snackBar.show("Please enter exchange rate", false);
        return;
      }
      if (!this.payinRate) {
        this.snackBar.show("Please enter Payin rate", false);
        return;
      }
      if (!this.payoutRate) {
        this.snackBar.show("Please enter Payout rate", false);
        return;
      }

      payload = {
        currency: this.selectedCurrency,
        rate: this.currencyRate,
        modes: this.selectedModes,
        payinRate: this.payinRate,
        payoutRate: this.payoutRate,
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

        const key = this.selectedCurrency as keyof typeof this.existingData;

        if (!this.existingData[key]) {
          this.existingData[key] = {
            rate: this.currencyRate,
            payinRate: this.payinRate,
            payoutRate: this.payoutRate,
            modes: [...this.selectedModes],
          };
        } else {
          this.existingData[key]!.modes = [...this.selectedModes];
        }

        this.clearSelection();

        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },
      error: (err) => {
        this.snackBar.show(err.error?.message || "Update failed", false);
      },
    });
  }

  closeModal() {
    this.close.emit();
  }
}
