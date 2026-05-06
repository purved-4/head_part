import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadBranchReportsComponent } from './head-branch-reports.component';

describe('HeadBranchReportsComponent', () => {
  let component: HeadBranchReportsComponent;
  let fixture: ComponentFixture<HeadBranchReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadBranchReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadBranchReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
