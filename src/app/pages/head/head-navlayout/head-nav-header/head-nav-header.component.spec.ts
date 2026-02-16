import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadNavHeaderComponent } from './head-nav-header.component';

describe('ManagerNavHeaderComponent', () => {
  let component: HeadNavHeaderComponent;
  let fixture: ComponentFixture<HeadNavHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadNavHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadNavHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
