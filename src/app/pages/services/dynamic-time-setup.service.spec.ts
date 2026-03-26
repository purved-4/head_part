import { TestBed } from '@angular/core/testing';

import { DynamicTimeSetupService } from './dynamic-time-setup.service';

describe('DynamicTimeSetupService', () => {
  let service: DynamicTimeSetupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DynamicTimeSetupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
