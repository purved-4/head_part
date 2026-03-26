import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecycleManagementComponent } from './recycle-management.component';

describe('RecycleManagementComponent', () => {
  let component: RecycleManagementComponent;
  let fixture: ComponentFixture<RecycleManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecycleManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecycleManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
