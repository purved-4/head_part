import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalReportComponent } from './portal-report.component';

describe('PortalReportComponent', () => {
  let component: PortalReportComponent;
  let fixture: ComponentFixture<PortalReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortalReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
