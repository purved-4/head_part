import { TestBed } from '@angular/core/testing';

import { UpiService } from './upi.service';

describe('UpiService', () => {
  let service: UpiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
