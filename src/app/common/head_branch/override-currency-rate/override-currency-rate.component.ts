
import { Component, OnInit, Input } from "@angular/core";
import { UserStateService } from "../../../store/user-state.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { CurrencyService } from "../../../pages/services/currency.service";

@Component({
  selector: "app-override-currency-rate",
  templateUrl: "./override-currency-rate.component.html",
  styleUrl: "./override-currency-rate.component.css",
})
export class OverrideCurrencyRateComponent implements OnInit {
  @Input() entityId!: any;
  @Input() role!: any;
  @Input() isManagerView: boolean = false;

  canEdit: boolean = false;
  currencies: any[] = [];

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

            return {
              ...c,
              overrideRate: c.rate,
              effectiveFrom: this.formatToLocalDateTime(base),
              isEditing: false,
              _original: null,
            };
          });
        },
        error: () => {
          this.snack.show("Failed to load currencies", false);
        },
      });
  }

  startEdit(currency: any): void {
    currency._original = {
      overrideRate: currency.overrideRate,
      effectiveFrom: currency.effectiveFrom,
    };
    currency.isEditing = true;
  }

  cancelEdit(currency: any): void {
    if (currency._original) {
      currency.overrideRate = currency._original.overrideRate;
      currency.effectiveFrom = currency._original.effectiveFrom;
    }
    currency.isEditing = false;
    currency._original = null;
  }

  createCustomCurrency(item: any): void {
    if (!this.canEdit) return;

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
        item.isEditing = false;
      },
      error: (err: any) => {
        this.snack.show(err?.error?.message || "Save failed", false);
        if (item._original) {
          item.overrideRate = item._original.overrideRate;
          item.effectiveFrom = item._original.effectiveFrom;
        }
        item.isEditing = false;
        item._original = null;
      },
    });
  }

  formatToLocalDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
