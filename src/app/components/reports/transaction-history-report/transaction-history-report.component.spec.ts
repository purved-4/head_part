import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionHistoryReportComponent } from './transaction-history-report.component';

describe('TransactionHistoryReportComponent', () => {
  let component: TransactionHistoryReportComponent;
  let fixture: ComponentFixture<TransactionHistoryReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionHistoryReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionHistoryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
