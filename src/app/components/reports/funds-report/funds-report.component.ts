import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from "@angular/forms";
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

interface Portal {
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
  portals: Portal[] = [];
  loadingEntities: boolean = false;
  loadingPortals: boolean = false;

  // Sorting & pagination
  sortColumn: string = "";
  sortDirection: "asc" | "desc" = "asc";
  currentPage: number = 1;
  itemsPerPage: number = 10;
  Math: any = Math;

  currentUserId: any;
  currentRole: any;
  currentRoleId: any;

  // Date range options
  months = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ];
  years: number[] = [];

  constructor(
    private reportService: TransactionHistoryService,
    private userService: UserService,
    private fb: FormBuilder,
    private utilService: UtilsServiceService,
    private stateService: UserStateService,
  ) {
    this.reportForm = this.fb.group(
      {
        entityType: ["", Validators.required],
        entityId: ["", Validators.required],
        portalId: [""],
        reportType: ["ALL"],
        dateRangeMode: ["custom"],
        fromDate: ["", Validators.required],
        toDate: ["", Validators.required],
        fromMonth: [""],
        toMonth: [""],
        selectedYear: [""],
        reviewStatus: ["ALL"],
      },
      { validators: this.monthRangeValidator },
    );
  }

  ngOnInit(): void {
    this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(
      this.stateService.getRole(),
    );

    this.currentUserId = this.stateService.getUserId();
    this.currentRole = this.stateService.getRole();
    this.currentRoleId = this.stateService.getCurrentEntityId();

    this.generateYears();
    this.setDefaultDates();

    // If initial entityType matches current role, apply auto-select
    const initialRole = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(initialRole);

    // Listen for entityType changes
    this.reportForm.get("entityType")?.valueChanges.subscribe((role) => {
      this.applyEntityAutoSelect(role);
    });

    // Subscribe to entity changes to load portals
    this.reportForm.get("entityId")?.valueChanges.subscribe(() => {
      this.onEntityChange();
    });

    // Update validators when date range mode changes
    this.reportForm.get("dateRangeMode")?.valueChanges.subscribe((mode) => {
      this.updateDateValidators(mode);
    });
    this.updateDateValidators(this.reportForm.get("dateRangeMode")?.value);
  }

  generateYears(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2000; year--) {
      this.years.push(year);
    }
  }

  setDefaultDates(): void {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    this.reportForm.patchValue({
      fromDate: lastWeek.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      dateRangeMode: "custom",
    });
  }

  // Custom validator for month range
  monthRangeValidator(group: AbstractControl): { [key: string]: any } | null {
    const mode = group.get("dateRangeMode")?.value;
    if (mode !== "month") return null;
    const fromMonth = group.get("fromMonth")?.value;
    const toMonth = group.get("toMonth")?.value;
    if (
      fromMonth &&
      toMonth &&
      parseInt(fromMonth, 10) > parseInt(toMonth, 10)
    ) {
      return { monthRangeInvalid: true };
    }
    return null;
  }

  updateDateValidators(mode: string): void {
    const fromDateControl = this.reportForm.get("fromDate");
    const toDateControl = this.reportForm.get("toDate");
    const fromMonthControl = this.reportForm.get("fromMonth");
    const toMonthControl = this.reportForm.get("toMonth");
    const yearControl = this.reportForm.get("selectedYear");

    fromDateControl?.clearValidators();
    toDateControl?.clearValidators();
    fromMonthControl?.clearValidators();
    toMonthControl?.clearValidators();
    yearControl?.clearValidators();

    if (mode === "custom") {
      fromDateControl?.setValidators([Validators.required]);
      toDateControl?.setValidators([Validators.required]);
    } else if (mode === "month") {
      fromMonthControl?.setValidators([Validators.required]);
      toMonthControl?.setValidators([Validators.required]);
      yearControl?.setValidators([Validators.required]);
    } else if (mode === "year") {
      yearControl?.setValidators([Validators.required]);
    }

    fromDateControl?.updateValueAndValidity();
    toDateControl?.updateValueAndValidity();
    fromMonthControl?.updateValueAndValidity();
    toMonthControl?.updateValueAndValidity();
    yearControl?.updateValueAndValidity();
  }

  applyEntityAutoSelect(role: string | null | undefined): void {
    if (!role) {
      this.entities = [];
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      return;
    }

    const roleNormalized = String(role).toUpperCase();
    const currentRoleNormalized = String(this.currentRole || "").toUpperCase();

    if (
      roleNormalized === currentRoleNormalized &&
      this.currentRoleId != null
    ) {
      // Auto‑select current user
      this.reportForm.patchValue({ entityId: this.currentRoleId });
      this.reportForm.get("entityId")?.disable();

      const currentUserName = "Current User"; // replace with actual name if available
      this.entities = [{ id: this.currentRoleId, name: currentUserName }];

      // Also load portals for this entity
      this.onEntityChange();
    } else {
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      this.entities = [];
      if (role) {
        this.loadEntitiesForRole(role);
      }
    }
  }

  loadEntitiesForRole(role: string): void {
    this.loadingEntities = true;
    this.entities = [];

    this.userService
      .getByRole(this.currentRoleId, role.toUpperCase())
      .subscribe({
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
    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);
  }

  onEntityChange(): void {
    const entityId = this.reportForm.get("entityId")?.value;
    const entityType = this.reportForm.get("entityType")?.value;

    if (!entityId || !entityType) {
      this.portals = [];
      return;
    }

    this.loadingPortals = true;
    this.utilService
      .getPortalByRoleIdAndRoleName(entityId, entityType)
      .subscribe({
        next: (res: any) => {
          if (Array.isArray(res)) {
            this.portals = res.map((item) => ({
              id: item.portalId || item,
              name: item.portalDomain || item.domain || item.portalId || item,
            }));
          } else if (res?.data) {
            this.portals = res.data.map((item: any) => ({
              id: item.portalId,
              name: item.portalDomain || item.domain || item.portalId,
            }));
          } else {
            this.portals = [];
          }
          this.loadingPortals = false;
        },
        error: (err) => {
          console.error("Error fetching portals:", err);
          this.portals = [];
          this.loadingPortals = false;
        },
      });
  }

  fetchReport(): void {
    const formValues = this.reportForm.getRawValue(); // includes disabled entityId if auto-selected

    // Manual presence checks because entityId may be disabled
    if (!formValues.entityType || !formValues.entityId) {
      this.reportForm.markAllAsTouched();
      return;
    }

    // Compute actual from and to dates based on mode
    let from: string, to: string;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    switch (formValues.dateRangeMode) {
      case "custom":
        from = formValues.fromDate;
        to = formValues.toDate;
        break;
      case "month":
        const year = parseInt(formValues.selectedYear, 10);
        const fromMonth = parseInt(formValues.fromMonth, 10);
        const toMonth = parseInt(formValues.toMonth, 10);
        from = new Date(year, fromMonth - 1, 1).toISOString().split("T")[0];
        if (year === currentYear && toMonth === currentMonth) {
          to = today.toISOString().split("T")[0];
        } else {
          const lastDay = new Date(year, toMonth, 0).getDate();
          to = new Date(year, toMonth - 1, lastDay).toISOString().split("T")[0];
        }
        break;
      case "year":
        const selYear = parseInt(formValues.selectedYear, 10);
        from = new Date(selYear, 0, 1).toISOString().split("T")[0];
        if (selYear === currentYear) {
          to = today.toISOString().split("T")[0];
        } else {
          to = new Date(selYear, 11, 31).toISOString().split("T")[0];
        }
        break;
      default:
        from = formValues.fromDate;
        to = formValues.toDate;
    }

    // Future date check
    const todayISODate = this.getTodayDate();
    if (from > todayISODate || to > todayISODate) {
      alert("Future dates are not allowed");
      return;
    }

    this.loading = true;
    this.error = null;
    this.report = null;
    this.currentPage = 1; // Reset to first page

    // Convert to ISO strings for API
    const fromISO = new Date(from).toISOString();
    const toISO = new Date(to).toISOString();

    this.reportService
      .getReport(
        fromISO,
        toISO,
        formValues.portalId || "",
        formValues.entityId,
        formValues.reviewStatus === "ALL" ? "" : formValues.reviewStatus,
      )
      .subscribe({
        next: (res: any) => {
          this.report = res;
          this.loading = false;
        },
        error: (err: any) => {
          this.error =
            err.error?.message || "Failed to load report. Please try again.";
          this.loading = false;
        },
      });
  }

  resetForm(): void {
    // Ensure entityId control is enabled before resetting
    this.reportForm.get("entityId")?.enable();

    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    this.reportForm.reset({
      entityType: "",
      entityId: "",
      portalId: "",
      reportType: "ALL",
      dateRangeMode: "custom",
      fromDate: lastWeek.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      fromMonth: "",
      toMonth: "",
      selectedYear: "",
      reviewStatus: "ALL",
    });

    this.entities = [];
    this.portals = [];
    this.report = null;
    this.error = null;
    this.currentPage = 1;
    this.sortColumn = "";
    this.sortDirection = "asc";

    // Re-apply auto-selection in case default entityType matches current role
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

    return allFunds
      .filter((fund) => fund.amount > 0)
      .reduce((t, f) => t + f.amount, 0);
  }

  getTotalDebits(): number {
    if (!this.report) return 0;

    const allFunds = [
      ...this.report.upiFunds,
      ...this.report.bankFunds,
      ...this.report.withdrawalFunds,
    ];

    return allFunds
      .filter((fund) => fund.amount < 0)
      .reduce((t, f) => t + Math.abs(f.amount), 0);
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

  // Sorting
  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }
    // In a real implementation you would sort the data here
    // For demo, we'll leave sorting to be handled by the template or pipe
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return "";
    return this.sortDirection === "asc" ? "rotate-180" : "";
  }

  // Pagination
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

  getMonthRangeError(): boolean {
    return (
      this.reportForm.hasError("monthRangeInvalid") &&
      this.reportForm.get("dateRangeMode")?.value === "month"
    );
  }
}
