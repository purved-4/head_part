import { TestBed } from '@angular/core/testing';

import { AffiliateService } from './affiliate.service';

describe('AffiliateService', () => {
  let service: AffiliateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AffiliateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
