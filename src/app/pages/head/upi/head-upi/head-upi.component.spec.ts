import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadUpiComponent } from './head-upi.component';

describe('HeadUpiComponent', () => {
  let component: HeadUpiComponent;
  let fixture: ComponentFixture<HeadUpiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadUpiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadUpiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
