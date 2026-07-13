import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalCompartPercentageComponent } from './global-compart-percentage.component';

describe('GlobalCompartPercentageComponent', () => {
  let component: GlobalCompartPercentageComponent;
  let fixture: ComponentFixture<GlobalCompartPercentageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalCompartPercentageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalCompartPercentageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
