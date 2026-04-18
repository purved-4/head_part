
import { Component, OnInit } from "@angular/core";
import { LimitsService } from "../../pages/services/reports/limits.service";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../pages/services/auth.service";
import { UtilsServiceService } from "../../utils/utils-service.service";
import { forkJoin } from "rxjs";
import { ChiefService } from "../../pages/services/chief.service";
import { log } from "node:util";
import { AnyARecord } from "node:dns";
import { error } from "node:console";

@Component({
  selector: "app-limits",
  templateUrl: "./limits.component.html",
  styleUrls: ["./limits.component.css"],
})
export class LimitsComponent implements OnInit {
  currentRoleId: any;
  currentUserId: any;
  role: any;
  loading = false;
  error: string | null = null;

  // Data storage
  downlevelData: any[] = [];
  paginatedDownlevelData: any[] = [];
  // CHIEF role specific data
  managersData: any[] = [];
  branchesData: any[] = [];
  activeTab: any;

  // Add TransactionAmount Modal
  showAddTransactionAmountModal = false;
  selectedEntity: any = null;
  transactionAmountToAdd: any;
  addingTransactionAmount = false;

  // View Limits Modal
  showViewLimitsModal = false;
  limitsData: any[] = [];
  loadingLimits = false;

  // Pagination (if needed later)
  currentPage = 0;
  pageSize = 5;
  totalPages = 0;
  totalElements = 0;

  showAdminSelfTransactionAmountModal = false;
  adminTransactionAmountToAdd: any;
  addingAdminTransactionAmount = false;

  showAdminLimitsModal = false;
  adminLimitsData: any[] = [];
  loadingAdminLimits = false;

  currentUserLimits: any = null;
  loadingCurrentUserLimits = false;

  selectedEntityBalances: any = null;
  loadingEntityBalances = false;
  chiefBuisnessType: any;

  constructor(
    private userStateService: UserStateService,
    private limitService: LimitsService,
    private utilSerivce: UtilsServiceService,
    private chiefService: ChiefService,
    private snackBar: SnackbarService,
  ) {}

  ngOnInit() {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    if (this.role === "CHIEF") {
      this.chiefService.getChiefsById(this.currentRoleId).subscribe((res) => {
        this.chiefBuisnessType = res.businessType;
        if (this.chiefBuisnessType === "B2C") {
          this.activeTab = "branch";
        } else {
          this.activeTab = "manager";
        }
        this.loadDownlevelData();
      });
    } else {
      this.loadDownlevelData();
    }
    this.loadCurrentUserLimits();
  }

  loadCurrentUserLimits() {
    this.loadingCurrentUserLimits = true;

    this.limitService
      .getLatestLimitsByEntityAndTypeUpdate(
        this.currentRoleId,
        this.role.toLowerCase(),
      )
      .subscribe({
        next: (res: any) => {
          this.currentUserLimits = res;
          this.loadingCurrentUserLimits = false;
        },
        error: (err) => {
          this.currentUserLimits = null;
          this.loadingCurrentUserLimits = false;
          this.snackBar.show(err.error?.message, false);
        },
      });
  }

  loadDownlevelData() {
    this.loading = true;
    this.error = null;

    if (this.currentRoleId && this.role) {
      if (this.role === "CHIEF") {
        // Make separate API calls for managers and branches
        this.utilSerivce
          .getDataWithEntityTypeAndId(
            this.currentRoleId,
            this.role.toLowerCase(),
            this.chiefBuisnessType,
          )
          .subscribe({
            next: (res: any) => {
              // if (this.chiefBuisnessType === "B2C") {
              //   this.branchesData = Array.isArray(res)
              //     ? res
              //     : res
              //       ? [res]
              //       : [];
              // } else if (this.chiefBuisnessType === "B2B") {
              //   this.managersData = Array.isArray(res)
              //     ? res
              //     : res
              //       ? [res]
              //       : [];
              // }
              // this.downlevelData = [...this.managersData, ...this.branchesData];
              // this.currentPage = 0;
              // this.updatePagination();
              // this.loading = false;

              this.downlevelData = Array.isArray(res) ? res : [res];
              this.currentPage = 0;
              this.updatePagination();
              this.loading = false;
            },
            error: (err: any) => {
              this.snackBar.show(err.error?.message, false);
              this.loading = false;
            },
          });
      } else {
        // For non-CHIEF roles, make single API call
        this.utilSerivce
          .getDataWithEntityTypeAndId(
            this.currentRoleId,
            this.role.toLowerCase(),
          )
          .subscribe({
            next: (res: any) => {
              this.downlevelData = Array.isArray(res) ? res : [res];
              this.currentPage = 0;
              this.updatePagination();
              this.loading = false;
            },
            error: (err: any) => {
              this.snackBar.show(err.error?.message, false);
              this.loading = false;
            },
          });
      }
    } else {
      this.snackBar.show("User role information not available", false);
      this.loading = false;
    }
  }

  // getType(type: any) {
  //   return this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(type);
  // }

  exportEntities() {
    this.downloadCSV(this.downlevelData, "entities");
  }
  exportManagers() {
    this.downloadCSV(this.managersData, "managers");
  }

  // Add TransactionAmount Modal Methods
  openAddTransactionAmountModal(entity: any) {
    this.selectedEntity = entity;
    this.transactionAmountToAdd = null;
    this.showAddTransactionAmountModal = true;
    const entityType =
      entity.entityType ||
      this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(
        entity.role || this.role,
      );

    this.loadingEntityBalances = true;

    this.limitService
      .getLatestLimitsByEntityAndTypeUpdate(entity.id, entityType)
      .subscribe({
        next: (res: any) => {
          this.selectedEntityBalances = res;
          this.loadingEntityBalances = false;
        },
        error: (err) => {
          this.selectedEntityBalances = null;
          this.loadingEntityBalances = false;
          this.snackBar.show(err.error?.message, false);
        },
      });
  }

  closeAddTransactionAmountModal() {
    this.showAddTransactionAmountModal = false;
    this.selectedEntity = null;
    this.transactionAmountToAdd = null;
    this.addingTransactionAmount = false;
    this.selectedEntityBalances = null;
  }

  submitAddTransactionAmount() {
    if (!this.transactionAmountToAdd || this.transactionAmountToAdd <= 0) {
      // this.snackBar.showError('Please enter a valid transactionAmount');
      return;
    }

    if (!this.selectedEntity) {
      // this.snackBar.showError('No entity selected');
      return;
    }

    this.addingTransactionAmount = true;

    // Determine entity type
    const entityType =
      this.selectedEntity.entityType ||
      this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(
        this.selectedEntity.role || this.role,
      );

    const payload = {
      entityId: this.selectedEntity.id,
      entityType: entityType,
      transactionAmount: this.transactionAmountToAdd,
    };

    this.limitService.addLimits(payload).subscribe({
      next: (res) => {
        // this.snackBar.showSuccess(`TransactionAmount ₹${this.transactionAmountToAdd} added successfully`);
        this.closeAddTransactionAmountModal();

        // Refresh both data
        this.loadDownlevelData();
        this.loadCurrentUserLimits(); // Add this line
      },
      error: (err) => {
        // this.snackBar.showError('Failed to add transactionAmount. Please try again.');
        this.addingTransactionAmount = false;
        this.snackBar.show(err.error?.message, false);
      },
    });
  }

  // Admin Self TransactionAmount Methods
  openAdminSelfTransactionAmountModal() {
    this.adminTransactionAmountToAdd = null;
    this.showAdminSelfTransactionAmountModal = true;
  }

  closeAdminSelfTransactionAmountModal() {
    this.showAdminSelfTransactionAmountModal = false;
    this.adminTransactionAmountToAdd = null;
    this.addingAdminTransactionAmount = false;
  }

  submitAdminSelfTransactionAmount() {
    if (
      !this.adminTransactionAmountToAdd ||
      this.adminTransactionAmountToAdd <= 0
    ) {
      // this.snackBar.showError('Please enter a valid transactionAmount');
      return;
    }

    this.addingAdminTransactionAmount = true;

    const payload = {
      entityId: this.currentRoleId,
      entityType: this.role.toLowerCase(),
      transactionAmount: this.adminTransactionAmountToAdd,
    };

    this.limitService.addLimits(payload).subscribe({
      next: (res) => {
        // this.snackBar.showSuccess(`TransactionAmount ₹${this.adminTransactionAmountToAdd} added successfully to your account`);
        this.closeAdminSelfTransactionAmountModal();

        // Refresh both data
        this.loadDownlevelData();
        this.loadCurrentUserLimits(); // Add this line
      },
      error: (err) => {
        // this.snackBar.showError('Failed to add transactionAmount. Please try again.');
        this.addingAdminTransactionAmount = false;
        this.snackBar.show(err.error?.message, false);
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
      this.selectedEntity.role || this.role,
    );
    console.log("entity type ", entityType);

    this.limitService
      .getLimitsByEntityAndType(this.selectedEntity.id, entityType)
      .subscribe({
        next: (res: any) => {
          // Handle both array response and single object
          this.limitsData = Array.isArray(res) ? res : [res];
          this.loadingLimits = false;
        },
        error: (err) => {
          // this.snackBar.showError('Failed to load limit data');
          this.loadingLimits = false;
          this.snackBar.show(err.error?.message, false);
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

  exportBranches() {
    this.downloadCSV(this.branchesData, "branches");
  }

  // Utility method to get proper type
  getEntityType(entity: any): string {
    return (
      entity.entityType ||
      this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(
        entity.role || this.role,
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
          // Handle both array response and single object
          this.adminLimitsData = Array.isArray(res) ? res : [res];
          this.loadingAdminLimits = false;
        },
        error: (err) => {
          // this.snackBar.showError('Failed to load admin limit data');
          this.loadingAdminLimits = false;
          this.snackBar.show(err.error?.message, false);
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
    switch (this.role) {
      case "OWNER":
        return "Owner";
      case "CHIEF":
        return "Chief";
      case "MANAGER":
        return "Manager";
      case "BRANCH":
        return "Branch";
      default:
        return this.role;
    }
  }

  getEntityTypeDisplay(entity: any): string {
    const type = entity.entityType || entity.role;
    switch (type?.toLowerCase()) {
      case "owner":
        return "Owner";
      case "chief":
        return "Chief";
      case "manager":
        return "Manager";
      case "branch":
        return "Branch";
      default:
        return type || "Entity";
    }
  }

  getEntityAvatarClass(entity: any): any {
    const type = entity.entityType || entity.role;
    switch (type?.toLowerCase()) {
      case "owner":
        return "bg-gradient-to-r from-purple-500 to-pink-600";
      case "chief":
        return "bg-gradient-to-r from-blue-500 to-indigo-600";
      case "manager":
        return "bg-gradient-to-r from-blue-500 to-indigo-600";
      case "branch":
        return "bg-gradient-to-r from-green-500 to-emerald-600";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  }

  getEntityTypeBadgeClass(entity: any): any {
    const type = entity.entityType || entity.role;
    switch (type?.toLowerCase()) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "chief":
        return "bg-blue-100 text-blue-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "branch":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  getType(type: any) {
    return this.utilSerivce.getRoleForDownLevelWithCurrentRoleId(type);
  }

  updatePagination() {
    this.totalElements = this.downlevelData.length;
    this.totalPages = Math.ceil(this.totalElements / this.pageSize);

    if (this.currentPage >= this.totalPages) {
      this.currentPage = this.totalPages - 1;
    }

    if (this.currentPage < 0) {
      this.currentPage = 0;
    }

    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.paginatedDownlevelData = this.downlevelData.slice(
      startIndex,
      endIndex,
    );
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePagination();
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(this.currentPage - 2, 0);
    let end = start + maxVisible;

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(end - maxVisible, 0);
    }

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }

  downloadCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;

    // Remove id field
    const headers = Object.keys(data[0]).filter((key) => key !== "id");

    const csvRows: string[] = [];

    // Header Row
    csvRows.push(headers.join(","));

    // Data Rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        let value = row[header];

        if (value === null || value === undefined) value = "";

        // Handle date formatting
        if (value instanceof Date) {
          value = value.toISOString();
        }

        return `"${value}"`;
      });

      csvRows.push(values.join(","));
    });

    const csvContent = csvRows.join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
