import { Component, OnInit, Input } from '@angular/core';
import { UserStateService } from '../../../store/user-state.service';
import { BranchService } from '../../../pages/services/branch.service';
import { HeadService } from '../../../pages/services/head.service';
import { SnackbarService } from '../../snackbar/snackbar.service';
import { CurrencyService } from '../../../pages/services/currency.service';

@Component({
  selector: 'app-override-currency-rate',
  templateUrl: './override-currency-rate.component.html',
  styleUrl: './override-currency-rate.component.css'
})
export class OverrideCurrencyRateComponent implements OnInit {

  // entityId!: any;
  // role!: any;

  
  @Input() entityId!: any;
  @Input() role!: any;
  @Input() isManagerView: boolean = false;

  payinStatus: boolean = false;
  customRate: boolean = false;

  currencies: any[] = [];
// isManagerView: boolean = false;
  constructor(
    private userStateServices: UserStateService,
    private branchService: BranchService,
    private headService: HeadService,
    private currencyServices: CurrencyService,
    private snack : SnackbarService
  ) {}

  // ngOnInit(): void {
  //   this.entityId = this.userStateServices.getCurrentEntityId();
  //   this.role = this.userStateServices.getRole();

  //   // Only call payin status for HEAD / BRANCH
  // if (!this.isManagerView) {
  //   this.getPayinStatus();
  // }
  //   this.loadCurrencies();      
  // }

    ngOnInit(): void {

    //  ONLY fallback if not coming from parent
    if (!this.entityId) {
      this.entityId = this.userStateServices.getCurrentEntityId();
    }

    if (!this.role) {
      this.role = this.userStateServices.getRole();
    }

    //  Manager should skip this
    if (!this.isManagerView) {
      this.getPayinStatus();
    }

    this.loadCurrencies();
  }

  

  //  FIXED METHOD
  private getPayinStatus() {

    if (this.role === 'BRANCH') {
      this.branchService.getBranchById(this.entityId).subscribe((res: any) => {

        this.customRate = res.customRate === true;   //  FIX

      });
    }

    if (this.role === 'HEAD' || this.role === 'HEADS') {
      this.headService.getHeadById(this.entityId).subscribe((res: any) => {

        this.customRate = res.customRate === true;   //  FIX

      });
    }
  }

  // unchanged (clean)
  // loadCurrencies() {
  //   this.currencyServices.getCustomCurrencies(this.entityId, this.role).subscribe({
  //     next: (res: any) => {
  //       this.currencies = (res.data || []).map((c: any) => ({
  //         ...c,
  //         overrideRate: c.rate,
  //            effectiveFrom: this.getLocalDateTime(),
  //         active: true,
  //           isEditing: false 
  //       }));
  //     },
  //     error: (err) => {

  //     }
  //   });
  // }

  loadCurrencies() {
  this.currencyServices.getCurrencyForHeadAndBranch(this.entityId, this.role).subscribe({
    next: (res: any) => {
    this.currencies = (res || []).map((c: any) => {
  const dynamicMin = c?.dynamicTime?.min ?? 0;

  // base time: API time OR current time
  const base = c?.effectiveFrom ? new Date(c.effectiveFrom) : new Date();

  // add dynamic + 1
  base.setMinutes(base.getMinutes() + dynamicMin + 1);

  return {
    ...c,
    overrideRate: c.rate,
    effectiveFrom: this.formatToLocalDateTime(base),
    active: true,
    isEditing: false
  };
});

    },
    error: (err) => {

    }
  });
}
  
  getLocalDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}
  
formatToLocalDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

  // createCustomCurrency(item: any) {
  //   if (!this.customRate) return;

  //   const payload = {
  //     entityId: this.entityId,
  //     entityType: this.role,
  //     chiefCurrencyId: item.currencyId,
  //     currency: item.currency,
  //     overrideRate: Number(item.overrideRate),
  //     effectiveFrom: item.effectiveFrom
  //       ? new Date(item.effectiveFrom).toISOString()
  //       : null,
  //     active: item.active ?? true
  //   };

  //   this.currencyServices.addCustomCurrencyForHeadAndBranch(payload).subscribe({
  //     next: (res: any) => {
  //       this.snack.show(res.message||"Created successfully",true)
  //     },
  //     error: (err) => {
  //       this.snack.show(err?.error?.message||"Create failed",false)
  //     }
  //   });
  // }
  createCustomCurrency(item: any) {
  if (!this.customRate) return;

  const payload = {
    entityId: this.entityId,
    entityType: this.role,
    chiefCurrencyId: item.currencyId,
    currency: item.currency,
    overrideRate: Number(item.overrideRate),
    effectiveFrom: item.effectiveFrom
      ? new Date(item.effectiveFrom).toISOString()
      : null,
    active: item.active ?? true
  };

  this.currencyServices.addCustomCurrencyForHeadAndBranch(payload).subscribe({
    next: (res: any) => {

      
      this.snack.show(res?.message || "Created successfully", true);

      // Clear backup on success
      item._original = null;
      item.isEditing = false;
    },

    error: (err) => {
      this.snack.show(err?.error?.message || "Create failed", false);

      //  REVERT TO ORIGINAL DATA
      if (item._original) {
        item.overrideRate = item._original.overrideRate;
        item.effectiveFrom = item._original.effectiveFrom;
        item.active = item._original.active;
      }

      item.isEditing = false;
    }
  });
}

  startEdit(currency: any) {
  currency.isEditing = true;

  // Store original values
  currency._original = {
    overrideRate: currency.overrideRate,
    effectiveFrom: currency.effectiveFrom,
    active: currency.active
  };
}
}