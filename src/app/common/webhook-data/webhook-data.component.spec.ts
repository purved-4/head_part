import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebhookDataComponent } from './webhook-data.component';

describe('WebhookDataComponent', () => {
  let component: WebhookDataComponent;
  let fixture: ComponentFixture<WebhookDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebhookDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WebhookDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
