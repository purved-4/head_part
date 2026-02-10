import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserService } from "../../../pages/services/user.service";
import { UtilsServiceService } from "../../../utils/utils-service.service";
import { UserStateService } from "../../../store/user-state.service";

export interface Fund {
  id: string;
  type: string;
  amount: number;
  runningBalance: number;
  createdAt: string;
  remarks?: string | null;
  status?: string | null;
  reviewStatus: string;
}

export interface FundsReport {
  upiFunds: Fund[];
  withdrawalFunds: Fund[];
  bankFunds: Fund[];
  openingBalance: number;
  closingBalance: number;
}

interface Entity {
  id: string;
  name: string;
}

interface Website {
  id: string;
  name: string;
}

@Component({
  selector: "app-funds-report",
  templateUrl: "./funds-report.component.html",
  styleUrls: ["./funds-report.component.css"],
})
export class FundsReportComponent implements OnInit {
  report: FundsReport | null = null;
  loading = false;
  error: string | null = null;

  entityTypes: any = [];

  reportForm: FormGroup;
  entities: Entity[] = [];
  websites: Website[] = [];
  loadingEntities: boolean = false;
  loadingWebsites: boolean = false;

  // Add these properties for enhanced UI
  sortColumn: string = "";
  sortDirection: "asc" | "desc" = "asc";
  currentPage: number = 1;
  itemsPerPage: number = 10;
  Math: any = Math;
  currentUserId: any;
  currentRole: any;
  currentRoleId: any;

  constructor(
    private reportService: TransactionHistoryService,
    private userService: UserService,
    private fb: FormBuilder,
    private utilService: UtilsServiceService,
    private stateService: UserStateService
  ) {
    this.reportForm = this.fb.group({
      entityType: ["", Validators.required],
      entityId: ["", Validators.required],
      websiteId: [""],
      reportType: ["ALL"],
      fromDate: ["", Validators.required],
      toDate: ["", Validators.required],
      reviewStatus: ["ALL"],
    });
  }

  ngOnInit(): void {
    this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(
      this.stateService.getRole()
    );

    this.currentUserId = this.stateService.getUserId();
    this.currentRole = this.stateService.getRole();
    this.currentRoleId = this.stateService.getCurrentRoleId();

    // Set default dates (last 7 days)
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    this.reportForm.patchValue({
      fromDate: lastWeek.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
    });

    // If initial entityType matches current role, apply auto-select
    const initialRole = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(initialRole);

    // Listen for entityType changes to apply auto-select or fetch entities
    this.reportForm.get("entityType")?.valueChanges.subscribe((role) => {
      this.applyEntityAutoSelect(role);
    });

    // Subscribe to entity changes to load websites (kept as before)
    this.reportForm.get("entityId")?.valueChanges.subscribe(() => {
      this.onEntityChange();
    });
  }

  /**
   * Apply auto-selection behavior:
   * - if selected role equals current user's role -> set entityId to currentRoleId and disable control
   * - otherwise enable control and fetch entities for the role
   */
  applyEntityAutoSelect(role: string | null | undefined): void {
    if (!role) {
      this.entities = [];
      // enable control so user can pick after role choice
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      return;
    }

    const roleNormalized = String(role).toUpperCase();
    const currentRoleNormalized = String(this.currentRole || "").toUpperCase();

    if (roleNormalized === currentRoleNormalized && this.currentRoleId != null) {
      // Auto-select current role id and disable the select so user can't change it
      this.reportForm.patchValue({ entityId: this.currentRoleId });
      this.reportForm.get("entityId")?.disable();

      // Provide a minimal entities array so the select has something to render.
      // Replace name with a nicer label if you can fetch display name.
      this.entities = [this.currentRoleId];

      // Also load websites for this auto-selected entity
      this.onEntityChange();
    } else {
      // Different role: enable selection and fetch list
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      this.entities = [];
      if (role) {
        this.loadEntitiesForRole(role);
      }
    }
  }

  // Loads entities list for the given role (used when role != currentRole)
  loadEntitiesForRole(role: string): void {
    this.loadingEntities = true;
    this.entities = [];

    this.userService.getByRole(this.currentRoleId, role.toUpperCase()).subscribe({
      next: (res: any) => {
        this.entities = Array.isArray(res) ? res : res.data?.data || [];
        this.loadingEntities = false;
      },
      error: (err) => {
        console.error("Error fetching entities:", err);
        this.entities = [];
        this.loadingEntities = false;
      },
    });
  }

  onRoleChange(): void {
    // kept for template usage; read role and apply behavior
    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);
  }

  onEntityChange(): void {
    const entityId = this.reportForm.get("entityId")?.value;
    const entityType = this.reportForm.get("entityType")?.value;

    if (!entityId || !entityType) {
      this.websites = [];
      return;
    }

    this.loadingWebsites = true;
    this.utilService.getWebsiteByRoleIdAndRoleName(entityId, entityType).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.websites = res.map((item) => ({
            id: item.websiteId || item,
            name: item.websiteId || item.domain || item.id,
          }));
        } else if (res?.data) {
          this.websites = res.data.map((item: any) => ({
            id: item.websiteId,
            name: item.websiteId || item.domain || item.id,
          }));
        } else {
          this.websites = [];
        }
        this.loadingWebsites = false;
      },
      error: (err) => {
        console.error("Error fetching websites:", err);
        this.websites = [];
        this.loadingWebsites = false;
      },
    });
  }

  fetchReport(): void {
    // use getRawValue so disabled entityId is available when auto-selected
    const formValues = this.reportForm.getRawValue();

    // manual presence checks because entityId may be disabled (so validators won't run)
    if (!formValues.entityType || !formValues.entityId || !formValues.fromDate || !formValues.toDate) {
      this.reportForm.markAllAsTouched();
      return;
    }

    // Convert dates to ISO string
    const from = new Date(formValues.fromDate).toISOString();
    const to = new Date(formValues.toDate).toISOString();

    // Validate dates: no future dates
    const todayISODate = new Date().toISOString().split("T")[0];
    if (formValues.fromDate > todayISODate || formValues.toDate > todayISODate) {
      alert("Future dates are not allowed");
      return;
    }

    this.loading = true;
    this.error = null;
    this.report = null;
    this.currentPage = 1; // Reset to first page when fetching new report

    this.reportService
      .getReport(
        from,
        to,
        formValues.websiteId || "",
        formValues.entityId,
        formValues.reviewStatus === "ALL" ? "" : formValues.reviewStatus
      )
      .subscribe({
        next: (res: any) => {
          this.report = res;
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err.error?.message || "Failed to load report. Please try again.";
          this.loading = false;
        },
      });
  }

  resetForm(): void {
    // ensure entityId control is enabled before resetting so value is cleared
    this.reportForm.get("entityId")?.enable();

    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    this.reportForm.reset({
      entityType: "",
      entityId: "",
      websiteId: "",
      reportType: "ALL",
      fromDate: lastWeek.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      reviewStatus: "ALL",
    });

    this.entities = [];
    this.websites = [];
    this.report = null;
    this.error = null;
    this.currentPage = 1;
    this.sortColumn = "";
    this.sortDirection = "asc";

    // re-apply auto-selection in case default entityType matches current role
    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);
  }

  getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  getTotalAmount(funds: Fund[]): number {
    return funds.reduce((total, fund) => total + fund.amount, 0);
  }

  getTotalCredits(): number {
    if (!this.report) return 0;

    const allFunds = [
      ...this.report.upiFunds,
      ...this.report.bankFunds,
      ...this.report.withdrawalFunds,
    ];

    return allFunds.filter((fund) => fund.amount > 0).reduce((t, f) => t + f.amount, 0);
  }

  getTotalDebits(): number {
    if (!this.report) return 0;

    const allFunds = [
      ...this.report.upiFunds,
      ...this.report.bankFunds,
      ...this.report.withdrawalFunds,
    ];

    return allFunds.filter((fund) => fund.amount < 0).reduce((t, f) => t + Math.abs(f.amount), 0);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-50 text-green-700 border border-green-200";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "REJECTED":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  }

  shouldShowSection(sectionType: string): boolean {
    const selectedType = this.reportForm.get("reportType")?.value;
    return selectedType === "ALL" || selectedType === sectionType;
  }

  hasData(): boolean {
    if (!this.report) return false;

    const selectedType = this.reportForm.get("reportType")?.value;

    switch (selectedType) {
      case "UPI":
        return this.report.upiFunds.length > 0;
      case "BANK":
        return this.report.bankFunds.length > 0;
      case "WITHDRAWAL":
        return this.report.withdrawalFunds.length > 0;
      default:
        return (
          this.report.upiFunds.length > 0 ||
          this.report.bankFunds.length > 0 ||
          this.report.withdrawalFunds.length > 0
        );
    }
  }

  // New methods for enhanced UI
  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return "text-gray-400";
    return this.sortDirection === "asc" ? "rotate-180" : "";
  }

  getPaginatedFunds(funds: Fund[]): Fund[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return funds.slice(startIndex, endIndex);
  }

  getTotalPages(funds: Fund[]): number {
    return Math.ceil(funds.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    this.currentPage = page;
  }

  getPageNumbers(funds: Fund[]): number[] {
    const totalPages = this.getTotalPages(funds);
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = end - maxVisible + 1;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }
}
