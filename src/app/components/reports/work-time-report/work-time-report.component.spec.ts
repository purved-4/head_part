import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkTimeReportComponent } from './work-time-report.component';

describe('WorkTimeReportComponent', () => {
  let component: WorkTimeReportComponent;
  let fixture: ComponentFixture<WorkTimeReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkTimeReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkTimeReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
