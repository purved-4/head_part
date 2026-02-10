import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadBankComponent } from './head-bank.component';

describe('HeadBankComponent', () => {
  let component: HeadBankComponent;
  let fixture: ComponentFixture<HeadBankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadBankComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadBankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
