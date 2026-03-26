import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceHistoryReportComponent } from './balance-history-report.component';

describe('BalanceHistoryReportComponent', () => {
  let component: BalanceHistoryReportComponent;
  let fixture: ComponentFixture<BalanceHistoryReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceHistoryReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BalanceHistoryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
