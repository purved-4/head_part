import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompartPercentageModleComponent } from './compart-percentage-modle.component';

describe('CompartPercentageModleComponent', () => {
  let component: CompartPercentageModleComponent;
  let fixture: ComponentFixture<CompartPercentageModleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompartPercentageModleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompartPercentageModleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
