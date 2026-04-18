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

  loadPortalCurrencies() {
    this.portalService.getCurrenciesbyPortal(this.entityId).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        this.loadExistingData(data);
        this.snackBar.show(res.message || "Portal currencies fetched", true);
        // By default INR select karo agar data hai
        this.setDefaultSelection();
      },
      error: (err) => {
        console.log("No existing data", err);
        this.snackBar.show(
          err.error?.message || "No portal currency data found",
          false,
        );
        // Agar error hai toh bhi INR select karo (empty form ke liye)
        this.setDefaultSelection();
      },
    });
  }

  // Default selection set karne ka method
  setDefaultSelection() {
    // Pehle check karo agar INR ka data hai toh
    if (this.existingData.INR) {
      this.selectCurrency("INR");
    }
    // Agar INR ka data nahi hai but USD ka data hai toh USD select karo
    else if (this.existingData.USD) {
      this.selectCurrency("USD");
    }
    // Agar koi data nahi hai toh bhi INR select karo (empty form)
    else {
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
          modes: this.convertModes(item.modes),
        };
      } else if (item.currency === "USD") {
        this.existingData.USD = {
          rate: item.rate,
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
    } else {
      this.currencyRate = null;
      this.selectedModes = [];
    }
  }

  clearSelection() {
    this.selectedCurrency = null;
    this.currencyRate = null;
    this.selectedModes = [];
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

    if (!this.currencyRate) {
      this.snackBar.show("Please enter exchange rate", false);
      return;
    }

    if (this.selectedModes.length === 0) {
      this.snackBar.show("Please select at least one payment mode", false);
      return;
    }

    const payload = {
      currency: this.selectedCurrency,
      rate: this.currencyRate,
      modes: this.selectedModes,
    };

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
        this.snackBar.show(
          res?.message ||
            `${this.selectedCurrency} ${this.getExistingDataForCurrency(this.selectedCurrency) ? "updated" : "added"} successfully`,
          true,
        );

        // Update existing data store
        if (
          !this.existingData[
            this.selectedCurrency as keyof typeof this.existingData
          ]
        ) {
          this.existingData[
            this.selectedCurrency as keyof typeof this.existingData
          ] = {
            rate: this.currencyRate,
            modes: [...this.selectedModes],
          };
        } else {
          this.existingData[
            this.selectedCurrency as keyof typeof this.existingData
          ]!.rate = this.currencyRate;
          this.existingData[
            this.selectedCurrency as keyof typeof this.existingData
          ]!.modes = [...this.selectedModes];
        }

        // Clear selection after successful save
        this.clearSelection();

        // Close modal after 1 second
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },
      error: (err) => {
        this.snackBar.show(
          err.error?.message ||
            `Failed to ${this.getExistingDataForCurrency(this.selectedCurrency) ? "update" : "add"} ${this.selectedCurrency}`,
          false,
        );
      },
    });
  }

  closeModal() {
    this.close.emit();
  }
}