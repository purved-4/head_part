import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadApprovedFundsComponent } from './head-approved-funds.component';

describe('HeadApprovedFundsComponent', () => {
  let component: HeadApprovedFundsComponent;
  let fixture: ComponentFixture<HeadApprovedFundsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadApprovedFundsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadApprovedFundsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
