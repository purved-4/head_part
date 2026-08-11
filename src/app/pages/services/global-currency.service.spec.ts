import { TestBed } from '@angular/core/testing';

import { GlobalCurrencyService } from './global-currency.service';

describe('GlobalCurrencyService', () => {
  let service: GlobalCurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalCurrencyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
