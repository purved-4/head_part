import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSplComponent } from './add-spl.component';

describe('AddSplComponent', () => {
  let component: AddSplComponent;
  let fixture: ComponentFixture<AddSplComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSplComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddSplComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
