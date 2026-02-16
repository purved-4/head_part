import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadNavDashboardLayoutComponent } from './head-nav-dashboard-layout.component';

describe('ManagerNavDashboardLayoutComponent', () => {
  let component: HeadNavDashboardLayoutComponent;
  let fixture: ComponentFixture<HeadNavDashboardLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadNavDashboardLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadNavDashboardLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
