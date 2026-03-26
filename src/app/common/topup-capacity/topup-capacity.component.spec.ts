import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopupCapacityComponent } from './topup-capacity.component';

describe('TopupCapacityComponent', () => {
  let component: TopupCapacityComponent;
  let fixture: ComponentFixture<TopupCapacityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopupCapacityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopupCapacityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
