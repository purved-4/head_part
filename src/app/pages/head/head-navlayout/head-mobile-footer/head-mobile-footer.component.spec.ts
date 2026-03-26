import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeadMobileFooterComponent } from './head-mobile-footer.component';

describe('HeadMobileFooterComponent', () => {
  let component: HeadMobileFooterComponent;
  let fixture: ComponentFixture<HeadMobileFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadMobileFooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeadMobileFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
