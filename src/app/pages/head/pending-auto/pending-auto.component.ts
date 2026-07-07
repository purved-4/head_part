import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { finalize } from "rxjs/operators";

import { ActivatedRoute, Router } from "@angular/router";
import { ChiefManualService } from "../../services/chief-manual.service";
import { UserStateService } from "../../../store/user-state.service";
import { SnackbarService } from "../../../common/snackbar/snackbar.service";
import { UserService } from "../../services/user.service";
@Component({
  selector: "app-pending-auto",
  templateUrl: "./pending-auto.component.html",
  styleUrls: ["./pending-auto.component.css"],
})
export class PendingAutoComponent implements OnInit {
  @ViewChild("searchInput", { static: false }) searchInput:
    | ElementRef
    | undefined;
  @ViewChild("limitModal", { static: false }) limitModal:
    | ElementRef
    | undefined;

  branches: any[] = [];
  filteredBranches: any[] = [];
  paginatedBranches: any[] = [];

  showRejectModal = false;
  selectedRejectId: string | null = null;

  //compart
  showUserPercentage = false;
  userPercentageLoading = false;
  userPercentageData: any = null;
  userPercentageError: string | null = null;
  showPercentageModal = false;
  id: any;
  entityId: any;
  userId: any;
  loading = false;
  activeTab: "pending" | "approved" | "rejected" = "pending";

  // Search & Filter
  searchTerm = "";
  statusFilter = "all";
  dateFilter = "all";

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  // Action states
  actionLoadingId: string | null = null;
  actionErrorId: string | null = null;
  successMessage: string | null = null;
  viewMode: "table" | "grid" = "table";
  // Modal states
  showLimitModal = false;
  pendingApprovalId: string | null = null;
  limitValue: number = 0;
  payinPercentage: number = 0;
  payoutPercentage: number = 0;
  fttPercentage: number = 0;
  modalLoading = false;
  modalErrorMessage: string | null = null;

  Math = Math;
  pendingCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  token: any;
  constructor(
    private chiefAutoService: ChiefManualService,
    private userStateService: UserStateService,
    private router: Router,
    private snackBar: SnackbarService,
    private route: ActivatedRoute,
    private userService: UserService,
  ) {}
  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.userId = this.userStateService.getUserId();

    this.route.queryParams.subscribe((params) => {
      this.token = params["token"];

      this.loadBranches();
    });
  }

  // ================= PARSE PAYLOAD =================

  parsePayload(payload: string): any {
    try {
      return JSON.parse(payload);
    } catch (error) {
      return {};
    }
  }

  // ================= APPROVE WITH MODAL =================

  openApprovalModal(id: string): void {
    if (!id) {
      this.showError("Invalid request ID");
      return;
    }

    this.pendingApprovalId = id;
    this.resetModalFields();
    this.showLimitModal = true;
  }

  // ================= LIMIT MODAL HANDLERS =================

  closeLimitModal(): void {
    this.showLimitModal = false;
    this.resetModalFields();
    this.pendingApprovalId = null;
  }

  // Validate form inputs
  validateModalForm(): boolean {
    this.modalErrorMessage = null;

    if (this.limitValue <= 0) {
      this.modalErrorMessage =
        "Please enter a valid limit amount (greater than 0)";
      return false;
    }

    if (this.payinPercentage < 0 || this.payinPercentage > 100) {
      this.modalErrorMessage = "payin percentage must be between 0 and 100";
      return false;
    }

    if (this.payoutPercentage < 0 || this.payoutPercentage > 100) {
      this.modalErrorMessage = "Payout percentage must be between 0 and 100";
      return false;
    }

    if (this.fttPercentage < 0 || this.fttPercentage > 100) {
      this.modalErrorMessage = "FTT percentage must be between 0 and 100";
      return false;
    }

    if (
      this.payinPercentage + this.payoutPercentage + this.fttPercentage >
      100
    ) {
      this.modalErrorMessage =
        "Sum of payin, payout, and FTT percentages cannot exceed 100%";
      return false;
    }

    return true;
  }

  skipApproval(): void {
    this.showLimitModal = false;
    this.resetModalFields();
    this.pendingApprovalId = null;
  }

  // ================= REMOVE FROM UI =================

  // removeFromList(id: string): void {
  //   this.branches = this.branches.filter(b => b.id !== id);
  //   this.applyFilters();
  // }

  // ================= FILTERS & SEARCH =================

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter = (event.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.applyFilters();
  }

  onDateFilterChange(event: Event): void {
    this.dateFilter = (event.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = "";
    this.statusFilter = "all";
    this.dateFilter = "all";
    this.currentPage = 1;
    this.applyFilters();

    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  // Helper for date filtering
  private matchesDateFilter(dateString: string): boolean {
    if (this.dateFilter === "all") return true;

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    switch (this.dateFilter) {
      case "today":
        return daysDiff === 0;
      case "week":
        return daysDiff >= 0 && daysDiff <= 7;
      case "month":
        return daysDiff >= 0 && daysDiff <= 30;
      default:
        return true;
    }
  }

  updatePaginatedList(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedBranches = this.filteredBranches.slice(start, end);
  }

  // ================= PAGINATION =================

  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.updatePaginatedList();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  onPageSizeChange(event: Event): void {
    this.pageSize = +(event.target as HTMLSelectElement).value;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    this.currentPage = 1;
    this.updatePaginatedList();
  }

  // ================= NOTIFICATIONS =================

  showSuccess(message: string): void {
    this.snackBar.show(message, true, 4000);
  }

  showError(message: string): void {
    this.snackBar.show(message, false, 4000);
  }

  // ================= HELPER METHODS =================

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "approved":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300";
      case "rejected":
        return "bg-rose-100 text-rose-800 border border-rose-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case "pending":
        return "schedule";
      case "approved":
        return "check_circle";
      case "rejected":
        return "cancel";
      default:
        return "info";
    }
  }

  getTabIcon(tab: "pending" | "approved" | "rejected"): string {
    switch (tab) {
      case "pending":
        return "schedule";
      case "approved":
        return "verified";
      case "rejected":
        return "block";
      default:
        return "info";
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }

  getRequestsCount(status: string): number {
    if (status === "all") return this.branches.length;
    return this.branches.filter((b) => b.status === status).length;
  }

  isActionDisabled(status: string): boolean {
    return status?.toLowerCase() !== "pending";
  }

  // Add this method to handle view mode changes
  setViewMode(mode: "table" | "grid"): void {
    this.viewMode = mode;
  }

  // ================= COUNT METHODS (Dynamic) =================

  // Get pending count - filters from current branches array
  getPendingCount(): number {
    return this.branches
      ? this.branches.filter((b) => b.status?.toLowerCase() === "pending")
          .length
      : 0;
  }

  // Get approved count - filters from current branches array
  getApprovedCount(): number {
    return this.branches
      ? this.branches.filter((b) => b.status?.toLowerCase() === "approved")
          .length
      : 0;
  }

  // Get rejected count - filters from current branches array
  getRejectedCount(): number {
    return this.branches
      ? this.branches.filter((b) => b.status?.toLowerCase() === "rejected")
          .length
      : 0;
  }

  // ================= TAB MANAGEMENT (Updated) =================

  switchTab(tab: "pending" | "approved" | "rejected"): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.searchTerm = "";
    this.statusFilter = "all";
    this.dateFilter = "all";
    // token remove from URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
    this.token = null;
    this.loadBranches();
  }

  // ================= LOAD DATA (Updated) =================

  loadBranches(): void {
    if (!this.entityId) return;

    this.loading = true;

    let status = "";

    switch (this.activeTab) {
      case "pending":
        status = "PENDING";
        break;
      case "approved":
        status = "APPROVED";
        break;
      case "rejected":
        status = "REJECTED";
        break;
      default:
        status = "PENDING";
    }

    this.chiefAutoService
      .getManualByChiefManualPending(this.entityId, status)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const allBranches = res?.data?.content || res?.content || [];

          // TOKEN MATCH FILTER
          if (this.token) {
            this.branches = allBranches.filter(
              (item: any) => item.chiefLink === this.token,
            );
          } else {
            this.branches = allBranches;
          }

          this.applyFilters();
        },
        error: (err) => {
          this.snackBar.show(err.error?.message, false);
        },
      });
  }

  // ================= APPROVE (Updated to refresh counts) =================

  approve(): void {
    // Validate form first
    if (!this.validateModalForm()) {
      return;
    }

    if (!this.pendingApprovalId) {
      this.showError("Invalid request ID");
      return;
    }

    this.modalLoading = true;
    this.modalErrorMessage = null;

    // Prepare the payload with all values
    const approvalPayload = {
      transactionAmount: this.limitValue,
      payinPercentage: this.payinPercentage,
      payoutPercentage: this.payoutPercentage,
      fttPercentage: this.fttPercentage,
    };

    // Call approveManual with the payload
    this.chiefAutoService
      .approveManual(this.pendingApprovalId, this.entityId, approvalPayload)
      .pipe(
        finalize(() => {
          this.modalLoading = false;
        }),
      )
      .subscribe({
        next: (res: any) => {
          this.snackBar.show(
            res?.message || "Request approved successfully!",
            true,
            4000,
          );
          this.showLimitModal = false;
          this.removeFromList(this.pendingApprovalId || "");
          this.resetModalFields();
          this.pendingApprovalId = null;
          // Counts will auto-update via getter methods
        },
        error: (err) => {
          this.snackBar.show(
            err?.error?.message || "Something went wrong",
            false,
          );
        },
      });
  }

  // ================= REJECT (Updated to refresh counts) =================

  openRejectModal(id: string): void {
    this.selectedRejectId = id;
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRejectId = null;
  }

  confirmReject(id: any): void {
    if (!this.selectedRejectId) return;

    this.id = this.selectedRejectId;

    this.showRejectModal = false;

    this.actionLoadingId = id;
    this.actionErrorId = null;

    this.chiefAutoService
      .rejectManual(id)
      .pipe(
        finalize(() => {
          this.actionLoadingId = null;
          this.selectedRejectId = null;
        }),
      )
      .subscribe({
        next: (res: any) => {
          this.snackBar.show(
            res?.message || "Request rejected successfully!",
            true,
            4000,
          );

          this.removeFromList(id);
        },
        error: (err) => {
          const message = err?.error?.message || "Something went wrong";

          this.snackBar.show(message, false, 4000);
          this.actionErrorId = id;
          this.showError("Failed to reject request");
        },
      });
  }
  // ================= REMOVE FROM UI (Updated) =================

  removeFromList(id: string): void {
    this.branches = this.branches.filter((b) => b.id !== id);
    this.applyFilters();
    // No need to manually update counts as getter methods will recalculate
  }

  // ================= FILTERS & SEARCH (Updated) =================

  applyFilters(): void {
    this.filteredBranches = this.branches.filter((branch) => {
      const data = this.parsePayload(branch.requestPayload);

      // Search filter
      const matchesSearch =
        !this.searchTerm ||
        data.name?.toLowerCase().includes(this.searchTerm) ||
        data.email?.toLowerCase().includes(this.searchTerm) ||
        data.phone?.toLowerCase().includes(this.searchTerm);

      // Status filter (based on current tab)
      const matchesStatus = branch.status?.toLowerCase() === this.activeTab;

      // Date filter
      const matchesDate = this.matchesDateFilter(branch.createdAt);

      return matchesSearch && matchesStatus && matchesDate;
    });

    this.totalItems = this.filteredBranches.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    this.currentPage = 1;

    this.updatePaginatedList();
  }

  // ================= PAGINATION HELPER METHODS =================

  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  resetModalFields(): void {
    this.limitValue = 0;
    this.payinPercentage = 0;
    this.payoutPercentage = 0;
    this.fttPercentage = 0;
    this.modalErrorMessage = null;
    this.showUserPercentage = false;
    this.userPercentageData = null;
    this.userPercentageError = null;
  }
  openPercentageModal(): void {
    this.showPercentageModal = true;
    this.userPercentageLoading = true;
    this.userPercentageError = null;
    this.userPercentageData = [];

    this.userService
      .getUserFullDetail(this.userId)
      .pipe(finalize(() => (this.userPercentageLoading = false)))
      .subscribe({
        next: (res: any) => {
          console.log("API Response:", res);

          // Service already response.data return karti hai
          this.userPercentageData = Array.isArray(res?.cpInfo)
            ? res.cpInfo
            : [];

          console.log("CP INFO:", this.userPercentageData);
        },
        error: (err) => {
          this.userPercentageError =
            err?.error?.message || "Failed to load percentage";
        },
      });
  }
  closePercentageModal() {
    this.showPercentageModal = false;
  }
}
