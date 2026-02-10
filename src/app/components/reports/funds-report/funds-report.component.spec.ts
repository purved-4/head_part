import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundsReportComponent } from './funds-report.component';

describe('FundsReportComponent', () => {
  let component: FundsReportComponent;
  let fixture: ComponentFixture<FundsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundsReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FundsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
