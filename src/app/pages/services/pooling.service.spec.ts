import { TestBed } from '@angular/core/testing';

import { PoolingService } from './pooling.service';

describe('PoolingService', () => {
  let service: PoolingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PoolingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
