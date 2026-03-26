import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecycleUpiComponent } from './recycle-upi.component';

describe('RecycleUpiComponent', () => {
  let component: RecycleUpiComponent;
  let fixture: ComponentFixture<RecycleUpiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecycleUpiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecycleUpiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
