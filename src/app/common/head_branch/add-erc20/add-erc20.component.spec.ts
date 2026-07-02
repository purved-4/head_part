import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddErc20Component } from './add-erc20.component';

describe('AddErc20Component', () => {
  let component: AddErc20Component;
  let fixture: ComponentFixture<AddErc20Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddErc20Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddErc20Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
