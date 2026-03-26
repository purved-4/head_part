import { TestBed } from '@angular/core/testing';

import { WorkReportService } from './work-report.service';

describe('WorkReportService', () => {
  let service: WorkReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
