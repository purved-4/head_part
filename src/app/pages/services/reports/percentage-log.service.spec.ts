import { TestBed } from '@angular/core/testing';

import { PercentageLogService } from './percentage-log.service';

describe('PercentageLogService', () => {
  let service: PercentageLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PercentageLogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
