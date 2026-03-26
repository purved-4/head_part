import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentLimitComponent } from './current-limit.component';

describe('CurrentLimitComponent', () => {
  let component: CurrentLimitComponent;
  let fixture: ComponentFixture<CurrentLimitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentLimitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentLimitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
