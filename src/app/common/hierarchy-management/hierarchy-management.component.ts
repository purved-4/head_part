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
import { HeadService } from "../../pages/services/head.service";

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

  // Chief level data
  managers: any[] = [];
  chiefHeads: any[] = []; // heads directly under chief

  // Manager -> Head flow data
  heads: any[] = []; // heads under a selected manager

  // Common branches (final step for both flows)
  branches: any[] = [];

  // Navigation state
  selectedManager: any = null;
  selectedHead: any = null;

  // Loading flags
  managersLoading = false;
  chiefHeadsLoading = false;
  headsLoading = false;
  branchesLoading = false;

  ownerId: any;

  constructor(
    private Hierarchy: HierarchyManagementService,
    private hearbeat: HeartbeatService,
    private headService: HeadService,
    private userStateService: UserStateService,
  ) {}

  // ================= INIT =================
  ngOnInit(): void {
    this.ownerId = this.userStateService.getCurrentEntityId();

    if (this.selectedChief) {
      this.hearbeat.chiefHeartbeat(this.selectedChief.id).subscribe({
        next: () => {},
        error: () => {},
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
    this.chiefHeads = [];
    this.heads = [];
    this.branches = [];
    this.selectedManager = null;
    this.selectedHead = null;
  }

  // ================= LOAD CHIEF LEVEL DATA (Managers + Heads together) =================
  loadHierarchy() {
    if (!this.selectedChief?.id) return;

    this.getManagers(this.selectedChief.id);
    this.getHeadsByChief(this.selectedChief.id);
  }

  // ================= API: MANAGERS UNDER CHIEF =================
  getManagers(chiefId: string) {
    this.managersLoading = true;

    this.Hierarchy.getManagersByChiefIdPaginated(chiefId).subscribe({
      next: (res: any) => {
        this.managers = res?.data?.content || res || [];

        this.managers.forEach((manager: any) => {
          this.checkManagerHeartbeat(manager);
        });

        this.managersLoading = false;
      },
      error: () => {
        this.managersLoading = false;
      },
    });
  }

  // ================= API: HEADS DIRECTLY UNDER CHIEF =================
  getHeadsByChief(chiefId: string) {
    this.chiefHeadsLoading = true;

    this.headService.getHeadByChiefId(chiefId).subscribe({
      next: (res: any) => {
        this.chiefHeads = res || [];

        this.chiefHeads.forEach((h: any) => {
          this.checkHeadHeartbeat(h);
        });

        this.chiefHeadsLoading = false;
      },
      error: () => {
        this.chiefHeadsLoading = false;
      },
    });
  }

  // ================= FLOW 1: CHIEF -> HEAD (direct) -> BRANCH =================
  selectChiefHead(head: any) {
    this.selectedManager = null; // isse pata chalega ye manager wala flow nahi hai
    this.getBranchesByHead(head);
  }

  // ================= FLOW 2: CHIEF -> MANAGER -> HEAD -> BRANCH =================
  getHeads(manager: any) {
    this.selectedManager = manager;
    this.selectedHead = null;
    this.headsLoading = true;
    this.heads = [];
    this.branches = [];

    this.checkManagerHeartbeat(manager);

    this.Hierarchy.getHeadByManagerId(manager.id).subscribe({
      next: (res: any) => {
        this.heads = res?.data || [];
        this.headsLoading = false;

        this.heads.forEach((h: any) => {
          this.checkHeadHeartbeat(h);
        });
      },
      error: () => {
        this.headsLoading = false;
      },
    });
  }

  // ================= COMMON: BRANCH BY HEAD (used by both flows) =================
  getBranchesByHead(head: any) {
    this.selectedHead = head;
    this.branchesLoading = true;
    this.branches = [];

    this.checkHeadHeartbeat(head);

    this.Hierarchy.getBranchByHeadId(head.id).subscribe({
      next: (res: any) => {
        this.branches = res?.data || [];
        this.branchesLoading = false;

        this.branches.forEach((b: any) => {
          this.checkBranchHeartbeat(b);
        });
      },
      error: () => {
        this.branchesLoading = false;
      },
    });
  }

  // ================= NAVIGATION HELPERS =================
  canGoBack(): boolean {
    return !!(this.selectedManager || this.selectedHead);
  }

  goBack(): void {
    if (this.selectedHead) {
      // Branches se wapas -> agar manager flow tha to Heads-under-manager pe,
      // warna seedha Chief level (managers + chiefHeads) pe
      this.selectedHead = null;
      this.branches = [];
    } else if (this.selectedManager) {
      // Heads-under-manager se wapas -> Chief level
      this.selectedManager = null;
      this.heads = [];
    }
  }

  isLoading(): boolean {
    if (this.selectedHead) {
      return this.branchesLoading;
    } else if (this.selectedManager) {
      return this.headsLoading;
    } else {
      return this.managersLoading || this.chiefHeadsLoading;
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
