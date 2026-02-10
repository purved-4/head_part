import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificateChatComponent } from './notificate-chat.component';

describe('NotificateChatComponent', () => {
  let component: NotificateChatComponent;
  let fixture: ComponentFixture<NotificateChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificateChatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificateChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
