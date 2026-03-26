import { TestBed } from '@angular/core/testing';

import { ChiefManualService } from './chief-manual.service';

describe('ChiefManualService', () => {
  let service: ChiefManualService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChiefManualService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
