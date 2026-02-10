import { TestBed } from '@angular/core/testing';

import {  ChiefService } from './chief.service';

describe('ChiefService', () => {
  let service: ChiefService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChiefService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
