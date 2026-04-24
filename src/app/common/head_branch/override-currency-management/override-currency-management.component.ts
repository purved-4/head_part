import { Component, OnInit } from '@angular/core';
import { UserStateService } from '../../../store/user-state.service';
import { BranchService } from '../../../pages/services/branch.service';
import { HeadService } from '../../../pages/services/head.service';
import { SnackbarService } from '../../snackbar/snackbar.service';
import { CurrencyService } from '../../../pages/services/currency.service';

@Component({
  selector: 'app-override-currency-management',
  templateUrl: './override-currency-management.component.html',
  styleUrls: ['./override-currency-management.component.css']
})
export class OverrideCurrencyManagementComponent implements OnInit {

  entityId!: any;
  role!: any;

  payinStatus: boolean = false;
  customRate: boolean = false;

  currencies: any[] = [];
isManagerView: boolean = false;
  constructor(
    private userStateServices: UserStateService,
    private branchService: BranchService,
    private headService: HeadService,
    private currencyServices: CurrencyService,
    private snack : SnackbarService
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateServices.getCurrentEntityId();
    this.role = this.userStateServices.getRole();

    // Only call payin status for HEAD / BRANCH
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
  //       console.error('Currency fetch failed', err);
  //     }
  //   });
  // }

  loadCurrencies() {
  this.currencyServices.getCustomCurrencies(this.entityId, this.role).subscribe({
    next: (res: any) => {
      this.currencies = (res.data || []).map((c: any) => ({
        ...c,
        overrideRate: this.isManagerView ? c.rate : c.rate,
        effectiveFrom: this.isManagerView ? c.effectiveFrom : this.getLocalDateTime(),
        active: true,
        isEditing: false
      }));
    },
    error: (err) => {
      console.error('Currency fetch failed', err);
    }
  });
}
  
  getLocalDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}
  

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

    this.currencyServices.createCustomCurrency(payload).subscribe({
      next: (res: any) => {
        console.log(' Created successfully', res);
      },
      error: (err) => {
        console.error(' Create failed', err);
      }
    });
  }
}