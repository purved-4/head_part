import { TestBed } from "@angular/core/testing";

import { ComPartService } from "./third-party.service";

describe("ComPartService", () => {
  let service: ComPartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComPartService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
