import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllotCurrencyComponent } from './allot-currency.component';

describe('AllotCurrencyComponent', () => {
  let component: AllotCurrencyComponent;
  let fixture: ComponentFixture<AllotCurrencyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllotCurrencyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllotCurrencyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
