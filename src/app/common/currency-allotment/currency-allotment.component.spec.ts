import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrencyAllotmentComponent } from './currency-allotment.component';

describe('CurrencyAllotmentComponent', () => {
  let component: CurrencyAllotmentComponent;
  let fixture: ComponentFixture<CurrencyAllotmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrencyAllotmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrencyAllotmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
