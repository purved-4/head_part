import { TestBed } from '@angular/core/testing';

import { SubjectRegistryService } from './subject-registry.service';

describe('SubjectRegistryService', () => {
  let service: SubjectRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubjectRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
