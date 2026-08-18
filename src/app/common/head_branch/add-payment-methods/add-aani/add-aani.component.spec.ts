import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAaniComponent } from './add-aani.component';

describe('AddAaniComponent', () => {
  let component: AddAaniComponent;
  let fixture: ComponentFixture<AddAaniComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAaniComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAaniComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
