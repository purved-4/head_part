import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpisComponent } from './upis.component';

describe('UpisComponent', () => {
  let component: UpisComponent;
  let fixture: ComponentFixture<UpisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
