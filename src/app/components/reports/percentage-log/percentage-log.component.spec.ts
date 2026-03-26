import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PercentageLogComponent } from './percentage-log.component';

describe('PercentageLogComponent', () => {
  let component: PercentageLogComponent;
  let fixture: ComponentFixture<PercentageLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PercentageLogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PercentageLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
