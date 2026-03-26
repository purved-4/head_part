import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecycleBankComponent } from './recycle-bank.component';

describe('RecycleBankComponent', () => {
  let component: RecycleBankComponent;
  let fixture: ComponentFixture<RecycleBankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecycleBankComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecycleBankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
