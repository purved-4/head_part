import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayinPayoutDashboardComponent } from './payin-payout-dashboard.component';

describe('PayinPayoutDashboardComponent', () => {
  let component: PayinPayoutDashboardComponent;
  let fixture: ComponentFixture<PayinPayoutDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayinPayoutDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayinPayoutDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
