import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddBep20Component } from './add-bep20.component';

describe('AddBep20Component', () => {
  let component: AddBep20Component;
  let fixture: ComponentFixture<AddBep20Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddBep20Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddBep20Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
