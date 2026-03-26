import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLimitPopupComponent } from './add-limit-popup.component';

describe('AddLimitPopupComponent', () => {
  let component: AddLimitPopupComponent;
  let fixture: ComponentFixture<AddLimitPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLimitPopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLimitPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
