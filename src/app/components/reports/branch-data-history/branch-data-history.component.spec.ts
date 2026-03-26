import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchDataHistoryComponent } from './branch-data-history.component';

describe('BranchDataHistoryComponent', () => {
  let component: BranchDataHistoryComponent;
  let fixture: ComponentFixture<BranchDataHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchDataHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BranchDataHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
