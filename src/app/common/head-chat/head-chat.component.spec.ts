import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadChatComponent } from './head-chat.component';

describe('HeadChatComponent', () => {
  let component: HeadChatComponent;
  let fixture: ComponentFixture<HeadChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadChatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
