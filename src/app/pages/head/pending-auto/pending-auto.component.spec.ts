import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingAutoComponent } from './pending-auto.component';

describe('PendingAutoComponent', () => {
  let component: PendingAutoComponent;
  let fixture: ComponentFixture<PendingAutoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingAutoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingAutoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
