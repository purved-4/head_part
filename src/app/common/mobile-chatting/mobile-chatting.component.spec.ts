import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileChattingComponent } from './mobile-chatting.component';

describe('MobileChattingComponent', () => {
  let component: MobileChattingComponent;
  let fixture: ComponentFixture<MobileChattingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileChattingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileChattingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
