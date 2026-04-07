import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarNotificationComponentComponent } from './sidebar-notification.component.component';

describe('SidebarNotificationComponentComponent', () => {
  let component: SidebarNotificationComponentComponent;
  let fixture: ComponentFixture<SidebarNotificationComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarNotificationComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarNotificationComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
