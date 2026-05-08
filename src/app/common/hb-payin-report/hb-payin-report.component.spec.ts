import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HbPayinReportComponent } from './hb-payin-report.component';

describe('HbPayinReportComponent', () => {
  let component: HbPayinReportComponent;
  let fixture: ComponentFixture<HbPayinReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HbPayinReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HbPayinReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
