import { ComponentFixture, TestBed } from "@angular/core/testing";

import { PayinCapacityComponent } from "./payin-capacity.component";

describe("PayinCapacityComponent", () => {
  let component: PayinCapacityComponent;
  let fixture: ComponentFixture<PayinCapacityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayinCapacityComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayinCapacityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
