import { TestBed } from "@angular/core/testing";

import { HierarchyManagementService } from "./hierarchy-management.service";

describe("HierarchyManagementService", () => {
  let service: HierarchyManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HierarchyManagementService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
