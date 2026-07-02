import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpiComponent } from './add-upi.component';

describe('AddUpiComponent', () => {
  let component: AddUpiComponent;
  let fixture: ComponentFixture<AddUpiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddUpiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
