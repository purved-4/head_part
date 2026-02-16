import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadNavSidebarComponent } from './head-nav-sidebar.component';

describe('ManagerNavSidebarComponent', () => {
  let component: HeadNavSidebarComponent;
  let fixture: ComponentFixture<HeadNavSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadNavSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadNavSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
