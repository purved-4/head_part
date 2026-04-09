import { TestBed } from '@angular/core/testing';

import { TimeZoneServiceService } from './time-zone-service.service';

describe('TimeZoneServiceService', () => {
  let service: TimeZoneServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimeZoneServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
