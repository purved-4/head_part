import { Component, OnInit } from '@angular/core';
import { PortalService } from '../../../pages/services/portal.service';
import { UserStateService } from '../../../store/user-state.service';

@Component({
  selector: 'app-payments-methods',
  templateUrl: './payments-methods.component.html',
  styleUrl: './payments-methods.component.css'
})
export class PaymentsMethodsComponent implements OnInit {

  entityId: any;
  role: any;

  currencies: any[] = [];
  selectedCurrency: any = null;

  availableModes: string[] = [];
  selectedMode: string = '';

  constructor(
    private portalService: PortalService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();

    this.loadCurrencies(); //  call here
  }

  loadCurrencies() {
    this.portalService
      .getCurrenciesByEntity(this.entityId, this.role)
      .subscribe({
        next: (res: any) => {
          this.currencies = res?.data || [];

          // optional: auto select first currency
          if (this.currencies.length) {
            this.onCurrencyChange(this.currencies[0].currency);
          }
        },
        error: () => {
          this.currencies = [];
        },
      });
  }

  // 🔹 Currency Change
  // onCurrencyChange(currency: string) {
  //   this.selectedCurrency = this.currencies.find(
  //     (c) => c.currency === currency
  //   );

  //   if (this.selectedCurrency) {
  //     this.availableModes = Object.keys(this.selectedCurrency.modes)
  //       .filter((key) => this.selectedCurrency.modes[key]);

  //     this.selectedMode = ''; // reset
  //   }
  // }

  onModeChange(event: Event) {
  const target = event.target as HTMLSelectElement | null;

  if (!target) return;

  this.selectedMode = target.value;
}

  onCurrencyChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;

  this.selectedCurrency = this.currencies.find(
    (c) => c.currency === value
  );

  if (this.selectedCurrency) {
    this.availableModes = Object.keys(this.selectedCurrency.modes)
      .filter((key) => this.selectedCurrency.modes[key]);

    this.selectedMode = '';
  }
}
}