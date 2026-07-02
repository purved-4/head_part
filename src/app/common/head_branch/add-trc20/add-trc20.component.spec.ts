import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTrc20Component } from './add-trc20.component';

describe('AddTrc20Component', () => {
  let component: AddTrc20Component;
  let fixture: ComponentFixture<AddTrc20Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTrc20Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddTrc20Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
