import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsMethodsComponent } from './payments-methods.component';

describe('PaymentsMethodsComponent', () => {
  let component: PaymentsMethodsComponent;
  let fixture: ComponentFixture<PaymentsMethodsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsMethodsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentsMethodsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
