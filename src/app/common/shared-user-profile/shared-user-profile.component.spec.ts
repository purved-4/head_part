import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedUserProfileComponent } from './shared-user-profile.component';

describe('SharedUserProfileComponent', () => {
  let component: SharedUserProfileComponent;
  let fixture: ComponentFixture<SharedUserProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedUserProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedUserProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
