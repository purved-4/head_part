import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryConfigurationComponent } from './inventory-configuration.component';

describe('InventoryConfigurationComponent', () => {
  let component: InventoryConfigurationComponent;
  let fixture: ComponentFixture<InventoryConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryConfigurationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
