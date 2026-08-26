import { TestBed } from '@angular/core/testing';

import { VyaaparService } from './vyaapar.service';

describe('VyaaparService', () => {
  let service: VyaaparService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VyaaparService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
