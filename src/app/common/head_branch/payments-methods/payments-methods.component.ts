
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
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
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();

    this.loadCurrencies();
    this.syncModeFromRoute();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncModeFromRoute();
      });
  }

  loadCurrencies() {
    this.portalService.getCurrenciesByEntity(this.entityId, this.role).subscribe({
      next: (res: any) => {
        this.currencies = res?.data || [];

        if (this.currencies.length) {
          this.onCurrencyChangeValue(this.currencies[0].currency);
        }
      },
      error: () => {
        this.currencies = [];
      },
    });
  }

  onCurrencyChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.onCurrencyChangeValue(value);
  }

  onCurrencyChangeValue(value: string) {
    this.selectedCurrency = this.currencies.find(c => c.currency === value);

    if (this.selectedCurrency) {
      this.availableModes = Object.keys(this.selectedCurrency.modes)
        .filter((key) => this.selectedCurrency.modes[key]);

      this.selectedMode = '';
      this.router.navigate(['.'], { relativeTo: this.route });
    } else {
      this.availableModes = [];
      this.selectedMode = '';
    }
  }

  onModeChange(event: Event) {
    const mode = (event.target as HTMLSelectElement).value;
    this.selectedMode = mode;

    if (mode) {
      this.router.navigate([mode], { relativeTo: this.route,queryParams:{currency:this.selectedCurrency.currency} });
    }
  }

  syncModeFromRoute() {
    const childPath = this.route.firstChild?.snapshot.routeConfig?.path || '';
    this.selectedMode = childPath;
  }
}