import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverrideCurrencyManagementComponent } from './override-currency-management.component';

describe('OverrideCurrencyManagementComponent', () => {
  let component: OverrideCurrencyManagementComponent;
  let fixture: ComponentFixture<OverrideCurrencyManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverrideCurrencyManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverrideCurrencyManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
