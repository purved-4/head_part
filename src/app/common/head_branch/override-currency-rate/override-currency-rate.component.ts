
import { Component, OnInit, OnDestroy, Input } from "@angular/core";

import { UserStateService } from "../../../store/user-state.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { CurrencyService } from "../../../pages/services/currency.service";

@Component({
  selector: "app-override-currency-rate",
  templateUrl: "./override-currency-rate.component.html",
  styleUrl: "./override-currency-rate.component.css",
})
export class OverrideCurrencyRateComponent implements OnInit, OnDestroy {
  @Input() entityId!: any;
  @Input() role!: any;
  @Input() isManagerView: boolean = false;

  canEdit: boolean = false;
  currencies: any[] = [];
  private editTimeout: any;
  constructor(
    private userStateServices: UserStateService,
    private currencyServices: CurrencyService,
    private snack: SnackbarService,
  ) {}

  ngOnInit(): void {
    if (!this.entityId) {
      this.entityId = this.userStateServices.getCurrentEntityId();
    }
    if (!this.role) {
      this.role = this.userStateServices.getRole();
    }
    this.loadCurrencies();
  }
  ngOnDestroy(): void {
    this.currencies.forEach((c) => this.stopEffectiveFromTimer(c));
  }
  loadCurrencies(): void {
    this.currencyServices
      .getCurrencyForHeadAndBranch(this.entityId, this.role)
      .subscribe({
        next: (res: any) => {
          // Interceptor already unwraps res.data, so res IS the data object
          // Try all 3 possible shapes and pick whichever has currencies
          const data = Array.isArray(res)
            ? { currencies: res, isEdited: false } // shape: []
            : Array.isArray(res?.currencies)
              ? res // shape: { currencies: [], isEdited: true }
              : Array.isArray(res?.data?.currencies)
                ? res.data // shape: { data: { currencies: [], isEdited: true } }
                : { currencies: [], isEdited: false }; // fallback

          this.canEdit = data.isEdited === true;

          this.currencies = (data.currencies || []).map((c: any) => {
            const dynamicMin = c?.dynamicTime?.min ?? 0;
            const base = c?.effectiveFrom
              ? new Date(c.effectiveFrom)
              : new Date();
            base.setMinutes(base.getMinutes() + dynamicMin + 6);

            // return {
            //   ...c,
            //   overrideRate: c.rate,
            //   effectiveFrom: this.formatToLocalDateTime(base),
            //   liveEffectiveFrom: this.formatToLocalDateTime(base),
            //   isEditing: false,
            //   _original: null,
            // };
            const item = {
              ...c,
              overrideRate: c.rate,
              effectiveFrom: this.formatToLocalDateTime(base),
              liveEffectiveFrom: this.formatToLocalDateTime(base),
              isEditing: false,
              _original: null,
            };

            this.startEffectiveFromTimer(item);

            return item;
          });
        },
        error: () => {
          this.snack.show("Failed to load currencies", false);
        },
      });
  }

  // startEdit(currency: any): void {
  //   currency._original = {
  //     overrideRate: currency.overrideRate,
  //     effectiveFrom: currency.effectiveFrom,
  //   };
  //   currency.isEditing = true;
  // }

  // cancelEdit(currency: any): void {
  //   if (currency._original) {
  //     currency.overrideRate = currency._original.overrideRate;
  //     currency.effectiveFrom = currency._original.effectiveFrom;
  //   }
  //   currency.isEditing = false;
  //   currency._original = null;
  // }

  startEdit(currency: any): void {
    currency._original = {
      overrideRate: currency.overrideRate,
      effectiveFrom: currency.effectiveFrom,
    };

    this.stopEffectiveFromTimer(currency);

    // Set the picker to whatever the live timer currently shows
    currency.effectiveFrom = currency.liveEffectiveFrom;

    currency.isEditing = true;

    if (this.editTimeout) {
      clearTimeout(this.editTimeout);
    }

    this.editTimeout = setTimeout(() => {
      if (currency.isEditing) {
        currency.isEditing = false;
        currency._original = null;

        this.loadCurrencies();
      }
    }, 60000); // 1 minute
  }
  cancelEdit(currency: any): void {
    if (this.editTimeout) {
      clearTimeout(this.editTimeout);
      this.editTimeout = null;
    }
    this.stopEffectiveFromTimer(currency);

    if (currency._original) {
      currency.overrideRate = currency._original.overrideRate;
      currency.effectiveFrom = currency._original.effectiveFrom;
    }
    if (currency._timer) {
      clearInterval(currency._timer);
      currency._timer = null;
    }
    currency.isEditing = false;
    currency._original = null;
    this.startEffectiveFromTimer(currency);
  }

  createCustomCurrency(item: any): void {
    if (!this.canEdit) return;
    this.stopEffectiveFromTimer(item);
    const payload = {
      entityId: this.entityId,
      entityType: this.role,
      chiefCurrencyId: item.currencyId,
      currency: item.currency,
      overrideRate: Number(item.overrideRate),
      effectiveFrom: item.effectiveFrom
        ? new Date(item.effectiveFrom).toISOString()
        : null,
      active: item.active ?? true,
    };

    this.currencyServices.addCustomCurrencyForHeadAndBranch(payload).subscribe({
      next: (res: any) => {
        this.snack.show(res?.message || "Saved successfully", true);
        item._original = null;

        if (item._timer) {
          clearInterval(item._timer);
          item._timer = null;
        }
        if (this.editTimeout) {
          clearTimeout(this.editTimeout);
          this.editTimeout = null;
        }
        item.isEditing = false;
        // item.liveEffectiveFrom = item.effectiveFrom;
        // this.startEffectiveFromTimer(item);
        this.loadCurrencies();
      },
      error: (err: any) => {
        this.snack.show(err?.error?.message || "Save failed", false);
        if (item._original) {
          item.overrideRate = item._original.overrideRate;
          item.effectiveFrom = item._original.effectiveFrom;
        }

        if (item._timer) {
          clearInterval(item._timer);
          item._timer = null;
        }
        item.isEditing = false;
        item._original = null;

        this.loadCurrencies();
      },
    });
  }

  // formatToLocalDateTime(date: Date): string {
  //   const pad = (n: number) => n.toString().padStart(2, "0");
  //   return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  // }
  formatToLocalDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private startEffectiveFromTimer(currency: any): void {
    this.stopEffectiveFromTimer(currency);

    const updateTime = () => {
      const dynamicMin = currency?.dynamicTime?.min ?? 0;

      const date = new Date();
      date.setMinutes(date.getMinutes() + dynamicMin + 6);

      // currency.effectiveFrom = this.formatToLocalDateTime(date);
      currency.liveEffectiveFrom = this.formatToLocalDateTime(date);
    };

    // Update immediately
    updateTime();

    // Keep updating every second
    currency._timer = setInterval(updateTime, 1000);
  }

  private stopEffectiveFromTimer(currency: any): void {
    if (currency._timer) {
      clearInterval(currency._timer);
      currency._timer = null;
    }
  }

  // private startEffectiveTimer(currency: any): void {
  //   if (currency._timer) {
  //     clearInterval(currency._timer);
  //   }

  //   currency._timer = setInterval(() => {
  //     const current = new Date(currency.effectiveFrom);
  //     current.setSeconds(current.getSeconds() + 1);
  //     currency.effectiveFrom = this.formatToLocalDateTime(current);
  //   }, 1000);
  // }
}
