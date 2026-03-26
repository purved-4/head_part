import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from "@angular/forms";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserService } from "../../../pages/services/user.service";
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
  portalAmount: number;
  runningBalance: number;
  mutedAmount: number;
  amount: number;
  dynamicPercentage: number;
  portalBefore: number;
  portalAfter: number;
  updatedAt: string;
  createdAt: string;
  portalId: string;
  portalDomain: string;
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
  reportGenerated = false;

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

  columns = [
    { key: "dateTime", label: "Date & Time", type: "date", sortable: true },
    { key: "transactionType", label: "Type", type: "string", sortable: true },
    { key: "portalDomain", label: "Portal", type: "string", sortable: true },
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
    { key: "fundsType", label: "Funds Type", type: "string", sortable: true },
    { key: "remark", label: "Remark", type: "string", sortable: true },
  ];

  totals: any = {};
  sortColumn: string = "dateTime";
  sortDirection: "asc" | "desc" = "desc";
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
    private stateService: UserStateService,
    private utilService: UtilsServiceService,
  ) {
    this.reportForm = this.fb.group(
      {
        entityType: ["", Validators.required],
        entityId: ["", Validators.required],
        dateRangeMode: ["custom"],
        fromDate: [""],
        toDate: [""],
        fromMonth: [""],
        toMonth: [""],
        selectedYear: [""],
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

    const initialRole = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(initialRole);

    this.reportForm.get("entityType")?.valueChanges.subscribe((role) => {
      this.applyEntityAutoSelect(role);
    });

    this.reportForm.get("dateRangeMode")?.valueChanges.subscribe((mode) => {
      this.updateDateValidators(mode);
    });
    this.updateDateValidators(this.reportForm.get("dateRangeMode")?.value);
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

  generateYears(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2000; year--) {
      this.years.push(year);
    }
  }

  setDefaultDates(): void {
    const today = new Date().toISOString().split("T")[0];
    this.reportForm.patchValue({
      fromDate: today,
      toDate: today,
    });
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
      this.reportForm.patchValue({ entityId: "" });
      this.reportForm.get("entityId")?.enable();
      return;
    }

    const roleNormalized = String(role).toUpperCase();
    const currentRoleNormalized = String(this.currentRole || "").toUpperCase();

    if (
      roleNormalized === currentRoleNormalized &&
      this.currentRoleId != null
    ) {
      this.reportForm.patchValue({ entityId: this.currentRoleId });
      this.reportForm.get("entityId")?.disable();
      this.entities = [{ id: this.currentRoleId, name: "Current User" }];
    } else {
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      this.fetchEntitiesForRole(role);
    }
  }

  fetchEntitiesForRole(role: string): void {
    if (!role) {
      this.entities = [];
      return;
    }

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

  onRoleChange(role: string): void {
    this.applyEntityAutoSelect(role);
  }

  fetchReport(): void {
    const formValue = this.reportForm.getRawValue();

    if (!formValue.entityType || !formValue.entityId) {
      this.markFormGroupTouched(this.reportForm);
      return;
    }

    // Compute dates based on mode
    let fromDate: string, toDate: string;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    switch (formValue.dateRangeMode) {
      case "custom":
        fromDate = formValue.fromDate;
        toDate = formValue.toDate;
        break;
      case "month":
        const year = parseInt(formValue.selectedYear, 10);
        const fromMonth = parseInt(formValue.fromMonth, 10);
        const toMonth = parseInt(formValue.toMonth, 10);
        fromDate = new Date(year, fromMonth - 1, 1).toISOString().split("T")[0];
        if (year === currentYear && toMonth === currentMonth) {
          toDate = today.toISOString().split("T")[0];
        } else {
          const lastDay = new Date(year, toMonth, 0).getDate();
          toDate = new Date(year, toMonth - 1, lastDay)
            .toISOString()
            .split("T")[0];
        }
        break;
      case "year":
        const selYear = parseInt(formValue.selectedYear, 10);
        fromDate = new Date(selYear, 0, 1).toISOString().split("T")[0];
        if (selYear === currentYear) {
          toDate = today.toISOString().split("T")[0];
        } else {
          toDate = new Date(selYear, 11, 31).toISOString().split("T")[0];
        }
        break;
      default:
        fromDate = formValue.fromDate;
        toDate = formValue.toDate;
    }

    // Future date check
    if (fromDate > this.getTodayDate() || toDate > this.getTodayDate()) {
      alert("Future dates are not allowed");
      return;
    }

    this.loading = true;
    this.reportGenerated = true;
    this.reportData = [];
    this.filteredData = [];
    this.totals = {};

    this.balanceHistoryService
      .getByEntityTypeAndId(formValue.entityType, formValue.entityId)
      .subscribe({
        next: (res: any) => {
          const responseData = res.data || res;
          this.processReportData(responseData, fromDate, toDate);
          this.loading = false;
        },
        error: (err) => {
          console.error("Error fetching report:", err);
          this.loading = false;
        },
      });
  }

  private isTransactionRecord(obj: any): boolean {
    return (
      obj && typeof obj === "object" && "dateTime" in obj && "amount" in obj
    );
  }

  // FIXED: Use string comparison on YYYY-MM-DD to avoid timezone issues
  private processReportData(
    data: any,
    fromDate?: string,
    toDate?: string,
  ): void {
    // Convert raw data to array of records
    if (Array.isArray(data)) {
      this.reportData = data;
    } else if (
      data &&
      typeof data === "object" &&
      this.isTransactionRecord(data)
    ) {
      this.reportData = [data];
    } else {
      this.reportData = [];
    }

    // Apply date filter using string comparison (YYYY-MM-DD)
    if (fromDate && toDate) {
      const from = fromDate; // already YYYY-MM-DD
      const to = toDate; // already YYYY-MM-DD
      this.reportData = this.reportData.filter((item) => {
        const itemDate = item.dateTime ? item.dateTime.split("T")[0] : "";
        return itemDate >= from && itemDate <= to;
      });
    }

    this.filteredData = [...this.reportData];
    this.calculateTotals();
    this.sortData();
    this.updatePagination();
  }

  private calculateTotals(): void {
    const numericColumns = [
      "amount",
      "balanceBefore",
      "balanceAfter",
      "runningBalance",
      "portalAmount",
      "mutedAmount",
      "portalBefore",
      "portalAfter",
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
      "portalAmount",
      "mutedAmount",
      "dynamicPercentage",
      "totalPercentage",
      "portalBefore",
      "portalAfter",
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
      "portalAmount",
      "mutedAmount",
      "portalBefore",
      "portalAfter",
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
    return (
      "₹" +
      absValue.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
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

  changeItemsPerPage(event: any): void {
    this.itemsPerPage = parseInt(event.target.value, 10);
    this.currentPage = 1;
    this.updatePagination();
  }

  exportToCSV(): void {
    const csvContent = this.convertToCSV(this.filteredData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `entity-report-${new Date().toISOString().split("T")[0]}.csv`,
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
        .join(","),
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
    this.reportForm.get("entityId")?.enable();
    this.reportForm.reset({
      dateRangeMode: "custom",
    });
    this.setDefaultDates();
    this.entities = [];
    this.reportData = [];
    this.filteredData = [];
    this.paginatedData = [];
    this.totals = {};
    this.currentPage = 1;
    this.reportGenerated = false;

    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);
  }

  getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return "swap_vert";
    return this.sortDirection === "asc" ? "arrow_upward" : "arrow_downward";
  }

  getMonthRangeError(): boolean {
    return (
      this.reportForm.hasError("monthRangeInvalid") &&
      this.reportForm.get("dateRangeMode")?.value === "month"
    );
  }
}
