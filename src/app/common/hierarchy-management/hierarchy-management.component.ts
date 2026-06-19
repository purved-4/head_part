import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
} from "@angular/core";
import { HierarchyManagementService } from "../../pages/services/hierarchy-management.service";
import { HeartbeatService } from "../../pages/services/heartbeat.service";
import { UserStateService } from "../../store/user-state.service";

@Component({
  selector: "app-hierarchy-management",
  templateUrl: "./hierarchy-management.component.html",
  styleUrls: ["./hierarchy-management.component.css"],
})
export class HierarchyManagementComponent implements OnChanges, OnInit {
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
  ownerId: any;
  constructor(
    private Hierarchy: HierarchyManagementService,
    private hearbeat: HeartbeatService,
    private userStateService: UserStateService,
  ) {}

  // ================= MAIN TRIGGER =================
  ngOnInit(): void {
    this.ownerId = this.userStateService.getCurrentEntityId();

    if (this.selectedChief) {
      this.hearbeat.chiefHeartbeat(this.selectedChief.id).subscribe({
        next: (res: any) => {

        },
        error: (err: any) => {

        },
      });
    }
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["chiefs"] && changes["chiefs"].currentValue) {
      this.selectedChief = this.chiefs;

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
    this.Hierarchy.getManagersByChiefIdPaginated(chiefId).subscribe({
      next: (res: any) => {
        this.managers = res?.data?.content || res || [];

        // AUTO HEARTBEAT FOR ALL MANAGERS
        this.managers.forEach((manager: any) => {
          this.checkManagerHeartbeat(manager);
        });

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      },
    });
  }

  // ================= API 2: HEADS (when manager clicked) =================
  getHeads(manager: any) {
    this.selectedManager = manager;
    this.selectedHead = null;
    this.headsLoading = true;
    this.heads = [];
    this.branches = [];

    // HEARTBEAT
    this.checkManagerHeartbeat(manager);

    this.Hierarchy.getHeadByManagerId(manager.id).subscribe({
      next: (res: any) => {
        this.heads = res?.data || [];
        this.headsLoading = false;

        // OPTIONAL: sab heads ka heartbeat auto call
        this.heads.forEach((h: any) => {
          this.checkHeadHeartbeat(h);
        });
      },
      error: (err) => {
        this.headsLoading = false;
      },
    });
  }
  // ================= API 3: BRANCH (when head clicked) =================
  getBranchesByHead(head: any) {
    this.selectedHead = head;
    this.branchesLoading = true;
    this.branches = [];

    // HEARTBEAT
    this.checkHeadHeartbeat(head);

    this.Hierarchy.getBranchByHeadId(head.id).subscribe({
      next: (res: any) => {
        this.branches = res?.data || [];
        this.branchesLoading = false;

        // OPTIONAL: all branches heartbeat
        this.branches.forEach((b: any) => {
          this.checkBranchHeartbeat(b);
        });
      },
      error: (err) => {
        this.branchesLoading = false;
      },
    });
  }

  // ================= B2C DIRECT BRANCH =================
  getBranchesByChief(chiefId: string) {
    this.Hierarchy.getBranchByChiefId(chiefId).subscribe({
      next: (res: any) => {
        this.branches = res?.data || [];

        this.branches.forEach((b: any) => {
          this.checkBranchHeartbeat(b);
        });

        this.loading = false;
      },
      error: (err) => {
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

  // ================= HEARTBEAT HELPERS =================

  checkManagerHeartbeat(manager: any) {
    this.hearbeat.managerHeartbeat(manager.id).subscribe({
      next: (res: any) => {
        const user = res?.[0];

        manager.onlineStatus = user?.online || false;
        manager.lastActive = user?.lastActive || null;
      },
      error: () => {
        manager.onlineStatus = false;
      },
    });
  }

  checkHeadHeartbeat(head: any) {
    this.hearbeat.headHeartbeat(head.id).subscribe({
      next: (res: any) => {
        const user = res?.[0];

        head.onlineStatus = user?.online || false;
        head.lastActive = user?.lastActive || null;
      },
      error: () => {
        head.onlineStatus = false;
      },
    });
  }

  checkBranchHeartbeat(branch: any) {
    this.hearbeat.branchHeartbeat(branch.id).subscribe({
      next: (res: any) => {
        const user = res?.[0];

        branch.onlineStatus = user?.online || false;
        branch.lastActive = user?.lastActive || null;
      },
      error: () => {
        branch.onlineStatus = false;
      },
    });
  }
  // ================= CLOSE MODAL =================
  closeModal() {
    this.resetAllData();
    this.close.emit();
  }
}
