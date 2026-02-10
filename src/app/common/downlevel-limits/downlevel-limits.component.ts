// downlevel-limits.component.ts
import { Component, OnInit } from "@angular/core";
import { LimitsService } from "../../pages/services/reports/limits.service";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../pages/services/auth.service";
import { UtilsServiceService } from "../../utils/utils-service.service";
import { forkJoin } from "rxjs";

@Component({
  selector: "app-downlevel-limits",
  templateUrl: "./downlevel-limits.component.html",
  styleUrls: ["./downlevel-limits.component.css"],
})
export class DownlevelLimitsComponent implements OnInit {
  currentRoleId: any;
  currentUserId: any;
  role: any;
  loading = false;
  error: string | null = null;

  // Data storage
  downlevelData: any[] = [];
  
  // CHIEF role specific data
  managersData: any[] = [];
  branchesData: any[] = [];
  activeTab: 'manager' | 'branch' = 'manager';

  // Add Amount Modal
  showAddAmountModal = false;
  selectedEntity: any = null;
  amountToAdd: any;
  addingAmount = false;

  // View Limits Modal
  showViewLimitsModal = false;
  limitsData: any[] = [];
  loadingLimits = false;

  // Pagination (if needed later)
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  showAdminSelfAmountModal = false;
  adminAmountToAdd: any;
  addingAdminAmount = false;

  showAdminLimitsModal = false;
  adminLimitsData: any[] = [];
  loadingAdminLimits = false;

  currentUserLimits: any = null;
  loadingCurrentUserLimits = false;

  constructor(
    private userStateService: UserStateService,
    private limitService: LimitsService,
    private utilSerivce: UtilsServiceService
  ) {}

  ngOnInit() {
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();
    this.loadCurrentUserLimits();
    this.loadDownlevelData();
  }

  loadCurrentUserLimits() {
    this.loadingCurrentUserLimits = true;

    this.limitService
      .getLatestLimitsByEntityAndType(
        this.currentRoleId,
        this.role.toLowerCase()
      )
      .subscribe({
        next: (res: any) => {
          console.log("Current user limits:", res);
          this.currentUserLimits = res;
          this.loadingCurrentUserLimits = false;
        },
        error: (err) => {
          console.error("Error fetching current user limits:", err);
          this.currentUserLimits = null;
          this.loadingCurrentUserLimits = false;
        },
      });
  }

  loadDownlevelData() {
    this.loading = true;
    this.error = null;
    
    if (this.currentRoleId && this.role) {
      if (this.role === 'CHIEF') {
        // Make separate API calls for managers and branches
        forkJoin({
          managers: this.utilSerivce.getDataWithEntityTypeAndId(
            this.currentRoleId, 
            this.role.toLowerCase(),
            "manager"
          ),
          branches: this.utilSerivce.getDataWithEntityTypeAndId(
            this.currentRoleId, 
            this.role.toLowerCase(),
            "branch"
          )
        }).subscribe({
          next: (results) => {
            console.log("Managers data:", results.managers);
            console.log("Branches data:", results.branches);
            
            // Handle responses (could be single object or array)
            this.managersData = Array.isArray(results.managers) ? results.managers : 
                               (results.managers ? [results.managers] : []);
            this.branchesData = Array.isArray(results.branches) ? results.branches : 
                               (results.branches ? [results.branches] : []);
            
            // Combine for downlevelData if needed
            this.downlevelData = [...this.managersData, ...this.branchesData];
            
            this.loading = false;
          },
          error: (err) => {
            console.error("Error loading CHIEF data:", err);
            this.error = "Failed to load entities. Please try again.";
            this.loading = false;
            // this.snackBar.showError('Failed to load entities');
          }
        });
      } else {
        // For non-CHIEF roles, make single API call
        this.utilSerivce
          .getDataWithEntityTypeAndId(this.currentRoleId, this.role.toLowerCase())
          .subscribe({
            next: (res: any) => {
              this.downlevelData = Array.isArray(res) ? res : [res];
              this.loading = false;
            },
            error: (err) => {
              this.error = "Failed to load entities. Please try again.";
              this.loading = false;
            },
          });
      }
    } else {
      this.error = "User role information not available";
      this.loading = false;
    }
  }

  // getType(type: any) {
  //   return this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(type);
  // }

  exportEntities() {
    console.log('Export entities:', this.downlevelData);
    // Implement export functionality
  }

  // Add Amount Modal Methods
  openAddAmountModal(entity: any) {
    this.selectedEntity = entity;
    this.amountToAdd = null;
    this.showAddAmountModal = true;
  }

  closeAddAmountModal() {
    this.showAddAmountModal = false;
    this.selectedEntity = null;
    this.amountToAdd = null;
    this.addingAmount = false;
  }

  submitAddAmount() {
    if (!this.amountToAdd || this.amountToAdd <= 0) {
      // this.snackBar.showError('Please enter a valid amount');
      return;
    }

    if (!this.selectedEntity) {
      // this.snackBar.showError('No entity selected');
      return;
    }

    this.addingAmount = true;

    // Determine entity type
    const entityType =
      this.selectedEntity.entityType ||
      this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(
        this.selectedEntity.role || this.role
      );

    const payload = {
      entityId: this.selectedEntity.id,
      entityType: this.role === "CHIEF" ? this.activeTab:entityType,
      amount: this.amountToAdd,
    };

    this.limitService.addLimits(payload).subscribe({
      next: (res) => {
        // this.snackBar.showSuccess(`Amount ₹${this.amountToAdd} added successfully`);
        this.closeAddAmountModal();

        // Refresh both data
        this.loadDownlevelData();
        this.loadCurrentUserLimits(); // Add this line
      },
      error: (err) => {
        console.error("Error adding amount:", err);
        // this.snackBar.showError('Failed to add amount. Please try again.');
        this.addingAmount = false;
      },
    });
  }

  // Admin Self Amount Methods
  openAdminSelfAmountModal() {
    this.adminAmountToAdd = null;
    this.showAdminSelfAmountModal = true;
  }

  closeAdminSelfAmountModal() {
    this.showAdminSelfAmountModal = false;
    this.adminAmountToAdd = null;
    this.addingAdminAmount = false;
  }

  submitAdminSelfAmount() {
    if (!this.adminAmountToAdd || this.adminAmountToAdd <= 0) {
      // this.snackBar.showError('Please enter a valid amount');
      return;
    }

    this.addingAdminAmount = true;

    const payload = {
      entityId: this.currentRoleId,
      entityType: this.role.toLowerCase(),
      amount: this.adminAmountToAdd,
    };
    
    console.log(this.role);
    this.limitService.addLimits(payload).subscribe({
      next: (res) => {
        // this.snackBar.showSuccess(`Amount ₹${this.adminAmountToAdd} added successfully to your account`);
        this.closeAdminSelfAmountModal();

        // Refresh both data
        this.loadDownlevelData();
        this.loadCurrentUserLimits(); // Add this line
      },
      error: (err) => {
        console.error("Error adding admin amount:", err);
        // this.snackBar.showError('Failed to add amount. Please try again.');
        this.addingAdminAmount = false;
      },
    });
  }

  // View Limits Methods
  viewLimits(entity: any) {
    this.selectedEntity = entity;
    this.showViewLimitsModal = true;
    this.loadLimitsData();
  }

  loadLimitsData() {
    this.loadingLimits = true;
    this.limitsData = [];

    // Determine entity type
    const entityType = this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(
      this.selectedEntity.role || this.role
    );
    
    this.limitService
      .getLimitsByEntityAndType(this.selectedEntity.id, entityType)
      .subscribe({
        next: (res: any) => {
          console.log("Limits data:", res);
          // Handle both array response and single object
          this.limitsData = Array.isArray(res) ? res : [res];
          this.loadingLimits = false;
        },
        error: (err) => {
          console.error("Error fetching limits data:", err);
          // this.snackBar.showError('Failed to load limit data');
          this.loadingLimits = false;
        },
      });
  }

  closeViewLimitsModal() {
    this.showViewLimitsModal = false;
    this.selectedEntity = null;
    this.limitsData = [];
    this.loadingLimits = false;
  }

  // Export methods for managers and branches
  exportManagers() {
    // Implement export functionality for managers
    // this.snackBar.showSuccess('Exporting managers...');
    console.log('Export managers:', this.managersData);
  }

  exportBranches() {
    // Implement export functionality for branches
    // this.snackBar.showSuccess('Exporting branches...');
    console.log('Export branches:', this.branchesData);
  }

  // Utility method to get proper type
  getEntityType(entity: any): string {
    return (
      entity.entityType ||
      this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(
        entity.role || this.role
      )
    );
  }

  // Admin View Limits Methods
  viewAdminLimits() {
    this.showAdminLimitsModal = true;
    this.loadAdminLimitsData();
  }

  loadAdminLimitsData() {
    this.loadingAdminLimits = true;
    this.adminLimitsData = [];

    this.limitService
      .getLimitsByEntityAndType(this.currentRoleId, this.role.toLowerCase())
      .subscribe({
        next: (res: any) => {
          console.log("Admin limits data:", res);
          // Handle both array response and single object
          this.adminLimitsData = Array.isArray(res) ? res : [res];
          this.loadingAdminLimits = false;
        },
        error: (err) => {
          console.error("Error fetching admin limits data:", err);
          // this.snackBar.showError('Failed to load admin limit data');
          this.loadingAdminLimits = false;
        },
      });
  }

  closeAdminLimitsModal() {
    this.showAdminLimitsModal = false;
    this.adminLimitsData = [];
    this.loadingAdminLimits = false;
  }

  exportAdminLimits() {
    // Implement export functionality for admin
    // this.snackBar.showSuccess('Admin export feature coming soon!');
  }

   getRoleDisplayName(): string {
    switch(this.role) {
      case 'OWNER': return 'Owner';
      case 'CHIEF': return 'Chief';
      case 'MANAGER': return 'Manager';
      case 'BRANCH': return 'Branch';
      default: return this.role;
    }
  }

  getEntityTypeDisplay(entity: any): string {
    const type = entity.entityType || entity.role;
    switch(type?.toLowerCase()) {
      case 'owner': return 'Owner';
      case 'chief': return 'Chief';
      case 'manager': return 'Manager';
      case 'branch': return 'Branch';
      default: return type || 'Entity';
    }
  }

  getEntityAvatarClass(entity: any): any {
    const type = entity.entityType || entity.role;
    switch(type?.toLowerCase()) {
      case 'owner':
        return 'bg-gradient-to-r from-purple-500 to-pink-600';
      case 'chief':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      case 'manager':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      case 'branch':
        return 'bg-gradient-to-r from-green-500 to-emerald-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  }

  getEntityTypeBadgeClass(entity: any): any {
    const type = entity.entityType || entity.role;
    switch(type?.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'chief':
        return 'bg-blue-100 text-blue-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'branch':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getType(type: any) {
    return this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(type);
  }

}