import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingThreadsComponent } from './pending-threads.component';

describe('PendingThreadsComponent', () => {
  let component: PendingThreadsComponent;
  let fixture: ComponentFixture<PendingThreadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingThreadsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingThreadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
