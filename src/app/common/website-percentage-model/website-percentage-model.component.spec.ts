import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebsitePercentageModelComponent } from './website-percentage-model.component';

describe('WebsitePercentageModelComponent', () => {
  let component: WebsitePercentageModelComponent;
  let fixture: ComponentFixture<WebsitePercentageModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebsitePercentageModelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WebsitePercentageModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
