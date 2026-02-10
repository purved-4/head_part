import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadBranchCapacityComponent } from './head-branch-capacity.component';

describe('HeadBranchCapacityComponent', () => {
  let component: HeadBranchCapacityComponent;
  let fixture: ComponentFixture<HeadBranchCapacityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadBranchCapacityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadBranchCapacityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
