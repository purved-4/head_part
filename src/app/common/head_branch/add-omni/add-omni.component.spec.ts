import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddOmniComponent } from './add-omni.component';

describe('AddOmniComponent', () => {
  let component: AddOmniComponent;
  let fixture: ComponentFixture<AddOmniComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddOmniComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddOmniComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
