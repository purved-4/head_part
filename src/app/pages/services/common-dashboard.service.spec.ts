import { TestBed } from '@angular/core/testing';

import { CommonDashboardService } from './common-dashboard.service';

describe('CommonDashboardService', () => {
  let service: CommonDashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommonDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
