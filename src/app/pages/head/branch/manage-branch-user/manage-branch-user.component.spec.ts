import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageBranchUserComponent  } from './manage-branch-user.component';

describe('ManagebranchUserComponent', () => {
  let component: ManageBranchUserComponent;
  let fixture: ComponentFixture<ManageBranchUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageBranchUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageBranchUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
