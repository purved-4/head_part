import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserDashboardUpiBankLimitComponent } from './user-dashboard-upi-bank-limit.component';

describe('UserDashboardUpiBankLimitComponent', () => {
  let component: UserDashboardUpiBankLimitComponent;
  let fixture: ComponentFixture<UserDashboardUpiBankLimitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDashboardUpiBankLimitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserDashboardUpiBankLimitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
