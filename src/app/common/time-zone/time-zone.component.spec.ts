import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeZoneComponent } from './time-zone.component';

describe('TimeZoneComponent', () => {
  let component: TimeZoneComponent;
  let fixture: ComponentFixture<TimeZoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeZoneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeZoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
