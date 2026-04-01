import { TestBed } from '@angular/core/testing';

import { AuthMemoryService } from './auth-memory.service';

describe('AuthMemoryService', () => {
  let service: AuthMemoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthMemoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
