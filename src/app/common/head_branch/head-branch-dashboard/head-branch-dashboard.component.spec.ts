import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadBranchDashboardComponent } from './head-branch-dashboard.component';

describe('HeadBranchDashboardComponent', () => {
  let component: HeadBranchDashboardComponent;
  let fixture: ComponentFixture<HeadBranchDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadBranchDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadBranchDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
