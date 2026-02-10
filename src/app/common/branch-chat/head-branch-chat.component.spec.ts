import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadBranchChatComponent } from './head-branch-chat.component';

describe('HeadBranchChatComponent', () => {
  let component: HeadBranchChatComponent;
  let fixture: ComponentFixture<HeadBranchChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadBranchChatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadBranchChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
