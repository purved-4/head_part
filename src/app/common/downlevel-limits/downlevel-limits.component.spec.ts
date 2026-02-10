import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DownlevelLimitsComponent } from './downlevel-limits.component';

describe('DownlevelLimitsComponent', () => {
  let component: DownlevelLimitsComponent;
  let fixture: ComponentFixture<DownlevelLimitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DownlevelLimitsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DownlevelLimitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
