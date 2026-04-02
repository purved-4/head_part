import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalPercentagePopupComponent } from './portal-percentage-popup.component';

describe('PortalPercentagePopupComponent', () => {
  let component: PortalPercentagePopupComponent;
  let fixture: ComponentFixture<PortalPercentagePopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalPercentagePopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortalPercentagePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
