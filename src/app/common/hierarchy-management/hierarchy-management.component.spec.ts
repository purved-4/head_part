import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HierarchyManagementComponent } from './hierarchy-management.component';

describe('HierarchyManagementComponent', () => {
  let component: HierarchyManagementComponent;
  let fixture: ComponentFixture<HierarchyManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HierarchyManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HierarchyManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
