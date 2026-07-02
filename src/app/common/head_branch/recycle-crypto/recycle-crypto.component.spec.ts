import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecycleCryptoComponent } from './recycle-crypto.component';

describe('RecycleCryptoComponent', () => {
  let component: RecycleCryptoComponent;
  let fixture: ComponentFixture<RecycleCryptoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecycleCryptoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecycleCryptoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
