import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { HierarchyManagementService } from "../../pages/services/hierarchy-management.service";

@Component({
  selector: "app-hierarchy-management",
  templateUrl: "./hierarchy-management.component.html",
  styleUrls: ["./hierarchy-management.component.css"],
})
export class HierarchyManagementComponent implements OnChanges {
  // ================= INPUT / OUTPUT =================
  @Input() chiefs: any;
  @Output() close = new EventEmitter<void>();

  // ================= STATE =================
  selectedChief: any = null;

  managers: any[] = [];
  heads: any[] = [];
  branches: any[] = [];

  // Navigation State
  selectedManager: any = null;
  selectedHead: any = null;

  loading = false;
  headsLoading = false;
  branchesLoading = false;

  constructor(private Hierarchy: HierarchyManagementService) {}

  // ================= MAIN TRIGGER =================
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["chiefs"] && changes["chiefs"].currentValue) {
      this.selectedChief = this.chiefs;
      console.log("MODAL OPEN + DATA RECEIVED:", this.selectedChief);
      this.resetAllData();
      this.loadHierarchy();
    }
  }

  // ================= RESET ALL DATA =================
  resetAllData() {
    this.managers = [];
    this.heads = [];
    this.branches = [];
    this.selectedManager = null;
    this.selectedHead = null;
  }

  // ================= LOAD BASED ON TYPE =================
  loadHierarchy() {
    if (!this.selectedChief?.id) return;

    this.loading = true;

    if (this.selectedChief.businessType === "B2B") {
      this.getManagers(this.selectedChief.id);
    } else {
      this.getBranchesByChief(this.selectedChief.id);
    }
  }

  // ================= API 1: MANAGERS =================
  getManagers(chiefId: string) {
    console.log("API CALL: Managers");

    this.Hierarchy.getManagersByChiefIdPaginated(chiefId).subscribe({
      next: (res: any) => {
        this.managers = res?.data?.content || res || [];
        this.loading = false;
      },
      error: (err) => {
        console.error("Manager API error", err);
        this.loading = false;
      },
    });
  }

  // ================= API 2: HEADS (when manager clicked) =================
  getHeads(manager: any) {
    console.log("API CALL: Heads for manager:", manager.id);

    this.selectedManager = manager;
    this.selectedHead = null;
    this.headsLoading = true;
    this.heads = [];
    this.branches = [];

    this.Hierarchy.getHeadByManagerId(manager.id).subscribe({
      next: (res: any) => {
        this.heads = res?.data || [];
        this.headsLoading = false;
        console.log("Heads loaded:", this.heads);
      },
      error: (err) => {
        console.error("Head API error", err);
        this.headsLoading = false;
      },
    });
  }

  // ================= API 3: BRANCH (when head clicked) =================
  getBranchesByHead(head: any) {
    console.log("API CALL: Branches by Head:", head.id);

    this.selectedHead = head;
    this.branchesLoading = true;
    this.branches = [];

    this.Hierarchy.getBranchByHeadId(head.id).subscribe({
      next: (res: any) => {
        this.branches = res?.data || [];
        this.branchesLoading = false;
        console.log("Branches loaded:", this.branches);
      },
      error: (err) => {
        console.error("Branch API error", err);
        this.branchesLoading = false;
      },
    });
  }

  // ================= B2C DIRECT BRANCH =================
  getBranchesByChief(chiefId: string) {
    console.log("API CALL: Branch by Chief");

    this.Hierarchy.getBranchByChiefId(chiefId).subscribe({
      next: (res: any) => {
        this.branches = res?.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error("Branch API error", err);
        this.loading = false;
      },
    });
  }

  // ================= NAVIGATION HELPERS =================
  canGoBack(): boolean {
    return !!(this.selectedManager || this.selectedHead);
  }

  goBack(): void {
    if (this.selectedHead) {
      // Go back to heads list
      this.selectedHead = null;
      this.branches = [];
    } else if (this.selectedManager) {
      // Go back to managers list
      this.selectedManager = null;
      this.heads = [];
    }
  }

  getCurrentViewTitle(): string {
    if (this.selectedHead) {
      return "Branches";
    } else if (this.selectedManager) {
      return "Heads";
    } else {
      return "Managers";
    }
  }

  getCurrentUserName(): string {
    if (this.selectedHead) {
      return this.selectedHead.username || this.selectedHead.info || "";
    } else if (this.selectedManager) {
      return this.selectedManager.username || this.selectedManager.info || "";
    }
    return "";
  }

  hasAnyData(): boolean {
    if (this.selectedHead) {
      return this.branches.length > 0;
    } else if (this.selectedManager) {
      return this.heads.length > 0;
    } else {
      return this.managers.length > 0;
    }
  }

  isLoading(): boolean {
    if (this.selectedHead) {
      return this.branchesLoading;
    } else if (this.selectedManager) {
      return this.headsLoading;
    } else {
      return this.loading;
    }
  }

  // ================= CLOSE MODAL =================
  closeModal() {
    this.resetAllData();
    this.close.emit();
  }
}
