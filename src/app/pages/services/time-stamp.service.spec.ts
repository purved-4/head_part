import { TestBed } from '@angular/core/testing';

import { TimeStampService } from './time-stamp.service';

describe('TimeStampService', () => {
  let service: TimeStampService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimeStampService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
