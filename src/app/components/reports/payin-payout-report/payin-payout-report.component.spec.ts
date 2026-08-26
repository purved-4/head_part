import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayinPayoutReportComponent } from './payin-payout-report.component';

describe('PayinPayoutReportComponent', () => {
  let component: PayinPayoutReportComponent;
  let fixture: ComponentFixture<PayinPayoutReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayinPayoutReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayinPayoutReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
