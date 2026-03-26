import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatResponsiveComponent } from './chat-responsive.component';

describe('ChatResponsiveComponent', () => {
  let component: ChatResponsiveComponent;
  let fixture: ComponentFixture<ChatResponsiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatResponsiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatResponsiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
