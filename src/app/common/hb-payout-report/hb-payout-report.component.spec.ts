import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HbPayoutReportComponent } from './hb-payout-report.component';

describe('HbPayoutReportComponent', () => {
  let component: HbPayoutReportComponent;
  let fixture: ComponentFixture<HbPayoutReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HbPayoutReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HbPayoutReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
