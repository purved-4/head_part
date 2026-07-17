import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResolvedNotificationComponent } from './resolved-notification.component';

describe('ResolvedNotificationComponent', () => {
  let component: ResolvedNotificationComponent;
  let fixture: ComponentFixture<ResolvedNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResolvedNotificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResolvedNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
