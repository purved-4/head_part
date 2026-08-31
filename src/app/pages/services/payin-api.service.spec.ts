import { TestBed } from '@angular/core/testing';

import { PayinApiService } from './payin-api.service';

describe('PayinApiService', () => {
  let service: PayinApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PayinApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
