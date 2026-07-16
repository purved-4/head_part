import { TestBed } from '@angular/core/testing';

import { BulkUpdateService } from './bulk-update.service';

describe('BulkUpdateService', () => {
  let service: BulkUpdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BulkUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
