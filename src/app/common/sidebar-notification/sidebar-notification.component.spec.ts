import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarNotificationComponent } from './sidebar-notification.component';

describe('SidebarNotificationComponent', () => {
  let component: SidebarNotificationComponent;
  let fixture: ComponentFixture<SidebarNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarNotificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
