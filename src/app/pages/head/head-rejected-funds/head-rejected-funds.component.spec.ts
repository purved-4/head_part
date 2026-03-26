import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadRejectedFundsComponent } from './head-rejected-funds.component';

describe('HeadRejectedFundsComponent', () => {
  let component: HeadRejectedFundsComponent;
  let fixture: ComponentFixture<HeadRejectedFundsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadRejectedFundsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadRejectedFundsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
