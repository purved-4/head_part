import { TestBed } from '@angular/core/testing';

import { CurrencyBehaviourService } from './currency-behaviour.service';

describe('CurrencyBehaviourService', () => {
  let service: CurrencyBehaviourService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrencyBehaviourService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
