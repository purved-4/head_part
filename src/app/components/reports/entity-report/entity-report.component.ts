import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { WorkTimeReportComponent } from "../work-time-report/work-time-report.component";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserService } from "../../../pages/services/user.service";
import { WorkReportsService } from "../../../pages/services/reports/work-report.service";
import { UserStateService } from "../../../store/user-state.service";
import { UtilsServiceService } from "../../../utils/utils-service.service";

export interface Entity {
  id: string;
  name: string;
  [key: string]: any;
}

export interface TransactionRecord {
  entityType: string;
  entityId: string;
  fundsType: string;
  fundsId: string;
  balanceBefore: number;
  balanceAfter: number;
  extraAmount: number;
  distributedAmount: number;
  distributedPercentage: number;
  mutedPercentage: number;
  totalPercentage: number;
  transactionType: string;
  dateTime: string;
  remark: string;
  websiteAmount: number;
  runningBalance: number;
  mutedAmount: number;
  amount: number;
  dynamicPercentage: number;
  websiteBefore: number;
  websiteAfter: number;
  updatedAt: string;
  createdAt: string;
  websiteId: string;
  websiteDomain: string;
  [key: string]: any;
}

@Component({
  selector: "app-entity-report",
  templateUrl: "./entity-report.component.html",
  styleUrls: ["./entity-report.component.css"],
})
export class EntityReportComponent implements OnInit {
  entityTypes: any = [];

  entities: Entity[] = [];
  reportData: TransactionRecord[] = [];
  filteredData: TransactionRecord[] = [];
  loading = false;
  loadingEntities = false;
  reportForm: FormGroup;

  // Define columns with proper display names and types
  columns = [
    { key: "dateTime", label: "Date & Time", type: "date", sortable: true },
    { key: "transactionType", label: "Type", type: "string", sortable: true },
    { key: "websiteDomain", label: "Website", type: "string", sortable: true },
    { key: "amount", label: "Amount", type: "currency", sortable: true },
    {
      key: "balanceBefore",
      label: "Balance Before",
      type: "currency",
      sortable: true,
    },
    {
      key: "balanceAfter",
      label: "Balance After",
      type: "currency",
      sortable: true,
    },
    {
      key: "runningBalance",
      label: "Running Balance",
      type: "currency",
      sortable: true,
    },
    {
      key: "websiteAmount",
      label: "Website Amount",
      type: "currency",
      sortable: true,
    },
    {
      key: "mutedAmount",
      label: "Muted Amount",
      type: "currency",
      sortable: true,
    },
    {
      key: "dynamicPercentage",
      label: "Dynamic %",
      type: "percentage",
      sortable: true,
    },
    {
      key: "totalPercentage",
      label: "Total %",
      type: "percentage",
      sortable: true,
    },
    { key: "fundsType", label: "Funds Type", type: "string", sortable: true },
    { key: "remark", label: "Remark", type: "string", sortable: true },
  ];

  // Totals object
  totals: any = {};

  // Sorting
  sortColumn: string = "dateTime";
  sortDirection: "asc" | "desc" = "desc";

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  paginatedData: TransactionRecord[] = [];
  Math: any = Math;

  currentUserId: any;
  currentRole: any;
  currentRoleId: any;

  constructor(
    private balanceHistoryService: TransactionHistoryService,
    private userService: UserService,
    private fb: FormBuilder,
    private workTimeReport: WorkReportsService,
    private stateService: UserStateService,
    private utilService: UtilsServiceService
  ) {
    this.reportForm = this.fb.group({
      entityType: ["", Validators.required],
      entityId: ["", Validators.required],
      fromDate: [""],
      toDate: [""],
    });
  }

  ngOnInit(): void {
    this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(
      this.stateService.getRole()
    );

    this.currentUserId = this.stateService.getUserId();
    this.currentRole = this.stateService.getRole();
    this.currentRoleId = this.stateService.getCurrentRoleId();

    this.setDefaultDates();

    // apply auto-select if initial entityType equals current role
    const initialRole = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(initialRole);

    // listen for entityType changes
    this.reportForm.get("entityType")?.valueChanges.subscribe((role) => {
      this.applyEntityAutoSelect(role);
    });
  }

  setDefaultDates(): void {
    const today = new Date().toISOString().split("T")[0];
    this.reportForm.patchValue({
      fromDate: today,
      toDate: today,
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
      this.reportForm.patchValue({ entityId: "" });
      this.reportForm.get("entityId")?.enable();
      return;
    }

    const roleNormalized = String(role).toUpperCase();
    const currentRoleNormalized = String(this.currentRole || "").toUpperCase();

    if (roleNormalized === currentRoleNormalized && this.currentRoleId != null) {
      console.log(this.currentRoleId);
      
      // Auto-select current role id and disable the select so user can't change it
      this.reportForm.patchValue({ entityId: this.currentRoleId });
      this.reportForm.get("entityId")?.disable();

      this.entities = [this.currentRoleId];
    } else {
      // Different role: enable selection and fetch list
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      this.fetchEntitiesForRole(role);
    }
  }

  // Fetch entities based on role (kept similar to your previous implementation)
  fetchEntitiesForRole(role: string): void {
    if (!role) {
      this.entities = [];
      return;
    }

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

  // kept for template compatibility if it directly calls onRoleChange
  onRoleChange(role: string): void {
    this.applyEntityAutoSelect(role);
  }

  fetchReport(): void {
    // use getRawValue so disabled entityId is available when auto-selected
    const formValue = this.reportForm.getRawValue();

    if (!formValue.entityType || !formValue.entityId) {
      this.markFormGroupTouched(this.reportForm);
      return;
    }

    this.loading = true;
    this.reportData = [];
    this.filteredData = [];
    this.totals = {};

    // Validate dates - no future dates
    const today = new Date().toISOString().split("T")[0];
    if (formValue.fromDate > today || formValue.toDate > today) {
      alert("Future dates are not allowed");
      this.loading = false;
      return;
    }

    this.balanceHistoryService
      .getByEntityTypeAndId(formValue.entityType, formValue.entityId)
      .subscribe({
        next: (res: any) => {
          const data = res.data || res || [];
          this.processReportData(data);
          this.loading = false;
        },
        error: (err) => {
          console.error("Error fetching report:", err);
          this.loading = false;
        },
      });
  }

  private processReportData(data: any): void {
    if (Array.isArray(data)) {
      this.reportData = data;
      this.filteredData = [...data];
      this.calculateTotals();
      this.sortData();
      this.updatePagination();
    } else if (typeof data === "object" && data !== null) {
      this.reportData = [data];
      this.filteredData = [data];
      this.calculateTotals();
      this.updatePagination();
    }
  }

  private calculateTotals(): void {
    const numericColumns = [
      "amount",
      "balanceBefore",
      "balanceAfter",
      "runningBalance",
      "websiteAmount",
      "mutedAmount",
      "websiteBefore",
      "websiteAfter",
      "extraAmount",
      "distributedAmount",
    ];

    numericColumns.forEach((col) => {
      this.totals[col] = this.reportData.reduce((sum, item) => {
        const value = parseFloat(item[col]) || 0;
        return sum + value;
      }, 0);
    });
  }

  sortData(column?: string): void {
    if (column) {
      if (this.sortColumn === column) {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.sortColumn = column;
        this.sortDirection = "asc";
      }
    }

    this.filteredData.sort((a, b) => {
      const aValue = a[this.sortColumn];
      const bValue = b[this.sortColumn];

      if (this.isDateColumn(this.sortColumn)) {
        return this.sortDirection === "asc"
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }

      if (this.isNumericColumn(this.sortColumn)) {
        const numA = parseFloat(aValue) || 0;
        const numB = parseFloat(bValue) || 0;
        return this.sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // String comparison
      const strA = String(aValue || "").toLowerCase();
      const strB = String(bValue || "").toLowerCase();

      if (strA < strB) return this.sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return this.sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    this.updatePagination();
  }

  isDateColumn(key: string): boolean {
    return (
      key.toLowerCase().includes("date") || key.toLowerCase().includes("time")
    );
  }

  isNumericColumn(key: string): boolean {
    const numericKeys = [
      "amount",
      "balanceBefore",
      "balanceAfter",
      "runningBalance",
      "websiteAmount",
      "mutedAmount",
      "dynamicPercentage",
      "totalPercentage",
      "websiteBefore",
      "websiteAfter",
      "extraAmount",
      "distributedAmount",
      "mutedPercentage",
      "distributedPercentage",
    ];
    return numericKeys.includes(key);
  }

  isCurrencyColumn(key: string): boolean {
    const currencyKeys = [
      "amount",
      "balanceBefore",
      "balanceAfter",
      "runningBalance",
      "websiteAmount",
      "mutedAmount",
      "websiteBefore",
      "websiteAfter",
      "extraAmount",
      "distributedAmount",
    ];
    return currencyKeys.includes(key);
  }

  isPercentageColumn(key: string): boolean {
    return key.toLowerCase().includes("percentage");
  }

  getAmountColor(amount: number, column: string): string {
    if (column === "amount") {
      return amount >= 0 ? "text-green-600" : "text-red-600";
    }
    return "text-gray-900";
  }

  getAmountBgColor(amount: number, column: string): string {
    if (column === "amount") {
      return amount >= 0 ? "bg-green-50" : "bg-red-50";
    }
    return "bg-white";
  }

  formatDate(value: any): string {
    if (!value) return "-";
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return (
        date.toLocaleDateString("en-IN") +
        " " +
        date.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      return value;
    }
  }

  formatCurrency(value: any): string {
    if (value === null || value === undefined || value === "") return "₹0.00";
    const num = parseFloat(value);
    if (isNaN(num)) return "₹0.00";

    const absValue = Math.abs(num);
    let formatted =
      "₹" +
      absValue.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    return formatted;
  }

  formatPercentage(value: any): string {
    if (value === null || value === undefined || value === "") return "0.00%";
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00%";
    return num.toFixed(2) + "%";
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  changeItemsPerPage(count: any): void {
    this.itemsPerPage = count;
    this.currentPage = 1;
    this.updatePagination();
  }

  exportToCSV(): void {
    // Implement CSV export functionality
    const csvContent = this.convertToCSV(this.filteredData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `entity-report-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private convertToCSV(data: any[]): string {
    const headers = this.columns.map((col) => col.label).join(",");
    const rows = data.map((row) =>
      this.columns
        .map((col) => {
          const value = row[col.key];
          if (this.isDateColumn(col.key)) return `"${this.formatDate(value)}"`;
          if (this.isCurrencyColumn(col.key))
            return this.formatCurrency(value).replace("₹", "");
          if (this.isPercentageColumn(col.key))
            return this.formatPercentage(value).replace("%", "");
          return `"${value || ""}"`;
        })
        .join(",")
    );
    return [headers, ...rows].join("\n");
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  clearForm(): void {
    // ensure entityId control is enabled before resetting so value is cleared
    this.reportForm.get("entityId")?.enable();
    this.reportForm.reset();
    this.setDefaultDates();
    this.entities = [];
    this.reportData = [];
    this.filteredData = [];
    this.paginatedData = [];
    this.totals = {};
    this.currentPage = 1;

    // re-apply auto selection in case default entityType matches current role
    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);
  }

  getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return "↕️";
    return this.sortDirection === "asc" ? "↑" : "↓";
  }
}
