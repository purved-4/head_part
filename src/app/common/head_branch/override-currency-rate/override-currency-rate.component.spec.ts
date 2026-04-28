import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverrideCurrencyRateComponent } from './override-currency-rate.component';

describe('OverrideCurrencyRateComponent', () => {
  let component: OverrideCurrencyRateComponent;
  let fixture: ComponentFixture<OverrideCurrencyRateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverrideCurrencyRateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverrideCurrencyRateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
