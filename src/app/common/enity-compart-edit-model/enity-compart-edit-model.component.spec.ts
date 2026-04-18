import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnityCompartEditModelComponent } from './enity-compart-edit-model.component';

describe('EnityCompartEditModelComponent', () => {
  let component: EnityCompartEditModelComponent;
  let fixture: ComponentFixture<EnityCompartEditModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnityCompartEditModelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnityCompartEditModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
