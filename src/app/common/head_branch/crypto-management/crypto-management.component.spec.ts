import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CryptoManagementComponent } from './crypto-management.component';

describe('CryptoManagementComponent', () => {
  let component: CryptoManagementComponent;
  let fixture: ComponentFixture<CryptoManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CryptoManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CryptoManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
