import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from "@angular/forms";
import { UtilsServiceService } from "../../../utils/utils-service.service";
import { UserService } from "../../../pages/services/user.service";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserStateService } from "../../../store/user-state.service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SnackbarService } from "../../../common/snackbar/snackbar.service";
import { PortalService } from "../../../pages/services/portal.service";

@Component({
  selector: "app-transaction-history-report",
  templateUrl: "./transaction-history-report.component.html",
  styleUrls: ["./transaction-history-report.component.css"],
})
export class TransactionHistoryReportComponent implements OnInit {
  reportForm!: FormGroup;

  loading = false;
  hasSearched = false;
  errorMessage = "";
  successMessage = "";
  exporting = false;

  reports: any[] = [];
  fromDate!: string;
  toDate!: string;
  totalCount = 0;

  isPortalReport = false;

  showModal = false;
  loadingShow = false;
  showResponse: any = null;
  activeEntity: any = null;

  loadingEntities = false;
  entities: any[] = [];

  loadingPortals = false;
  portals: any[] = [];

  entityTypes: any = [];

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  filterOptions = {
    transactionTypes: ["All", "payin", "payout", "Commission", "Reward"],
    statuses: ["All", "Success", "Failed", "Pending"],
    portals: ["All", "Portal1", "Portal2", "Portal3"],
  };

  dateRangeOptions = [
    {
      id: "custom",
      name: "Custom",
    },
    {
      id: "month",
      name: "Month",
    },
    {
      id: "year",
      name: "Year",
    },
  ];

  currentUserId: any;
  currentRole: any;
  currentRoleId: any;

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
    private fb: FormBuilder,
    private transactionService: TransactionHistoryService,
    private userService: UserService,
    private utilService: UtilsServiceService,
    private stateService: UserStateService,
    private snackBar: SnackbarService,
    private portalService: PortalService,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.stateService.getUserId();
    this.currentRole = this.stateService.getRole();
    this.currentRoleId = this.stateService.getCurrentEntityId();

    this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(
      this.stateService.getRole(),
    );

    this.generateYears();
    this.initializeForm();
    this.setupFormListeners();
    this.setDefaultDates();
    if (this.currentRole === "OWNER") {
      this.loadPortals();
    }

    const initialRole = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(initialRole);
  }

  generateYears(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2000; year--) {
      this.years.push(year);
    }
  }

  initializeForm(): void {
    this.reportForm = this.fb.group(
      {
        reportType: ["ENTITY", Validators.required],
        entityType: ["AGENT", Validators.required],
        entityId: ["", Validators.required],

        portalId: [""],
        dateRangeMode: ["custom"],
        from: [""],
        to: [""],
        fromMonth: [""],
        toMonth: [""],
        selectedYear: [""],
        transactionType: ["All"],
        status: ["All"],
        searchTerm: [""],
      },
      { validators: this.monthRangeValidator },
    );
  }

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

  setupFormListeners(): void {
    this.reportForm.get("entityType")?.valueChanges.subscribe((role) => {
      this.applyEntityAutoSelect(role);
    });

    this.reportForm.get("reportType")?.valueChanges.subscribe((type) => {
      if (type === "PORTAL") {
        this.reportForm.get("portalId")?.setValidators([Validators.required]);
        this.reportForm.get("entityId")?.clearValidators();
      } else {
        this.reportForm.get("entityId")?.setValidators([Validators.required]);
        this.reportForm.get("portalId")?.clearValidators();
      }

      this.reportForm.get("entityId")?.updateValueAndValidity();
      this.reportForm.get("portalId")?.updateValueAndValidity();
    });

    this.reportForm.get("dateRangeMode")?.valueChanges.subscribe((mode) => {
      this.updateDateValidators(mode);
    });
  }

  updateDateValidators(mode: string): void {
    const fromControl = this.reportForm.get("from");
    const toControl = this.reportForm.get("to");
    const fromMonthControl = this.reportForm.get("fromMonth");
    const toMonthControl = this.reportForm.get("toMonth");
    const yearControl = this.reportForm.get("selectedYear");

    fromControl?.clearValidators();
    toControl?.clearValidators();
    fromMonthControl?.clearValidators();
    toMonthControl?.clearValidators();
    yearControl?.clearValidators();

    if (mode === "custom") {
      fromControl?.setValidators([Validators.required]);
      toControl?.setValidators([Validators.required]);
    } else if (mode === "month") {
      fromMonthControl?.setValidators([Validators.required]);
      toMonthControl?.setValidators([Validators.required]);
      yearControl?.setValidators([Validators.required]);
    } else if (mode === "year") {
      yearControl?.setValidators([Validators.required]);
    }

    fromControl?.updateValueAndValidity();
    toControl?.updateValueAndValidity();
    fromMonthControl?.updateValueAndValidity();
    toMonthControl?.updateValueAndValidity();
    yearControl?.updateValueAndValidity();
    this.reportForm.updateValueAndValidity();
  }

  setDefaultDates(): void {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const fromISO = weekAgo.toISOString().split("T")[0];
    const toISO = today.toISOString().split("T")[0];

    this.reportForm.patchValue({
      from: fromISO,
      to: toISO,
      dateRangeMode: "custom",
    });

    this.fromDate = fromISO;
    this.toDate = toISO;
  }

  getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * If selected role equals the current user's role, set entityId to currentRoleId and disable the select.
   * Otherwise enable the control and fetch available entities for the role.
   */
  applyEntityAutoSelect(role: string): void {
    if (!role) {
      this.entities = [];
      this.reportForm.patchValue({ entityId: "" });
      this.reportForm.get("entityId")?.enable();
      return;
    }

    const roleNormalized = role.toUpperCase();
    const currentRoleNormalized = (this.currentRole || "").toUpperCase();

    if (roleNormalized === currentRoleNormalized && this.currentRoleId) {
      this.entities = [
        {
          id: this.currentRoleId,
          name: "Current User",
        },
      ];

      this.reportForm.patchValue({
        entityId: this.currentRoleId,
      });

      this.reportForm.get("entityId")?.disable();
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
          let list = [];

          if (Array.isArray(res)) {
            list = res;
          } else if (Array.isArray(res?.data)) {
            list = res.data;
          } else if (Array.isArray(res?.data?.data)) {
            list = res.data.data;
          } else if (Array.isArray(res?.data?.data?.data)) {
            list = res.data.data.data;
          }

          this.entities = list.map((item: any) => ({
            id: String(item.id),
            name: item.name,
          }));

          this.loadingEntities = false;
        },
        error: (err) => {
          this.entities = [];
          this.loadingEntities = false;
          this.snackBar.show(err.error?.message, false);
        },
      });
  }

  onRoleChange(role: string): void {
    this.applyEntityAutoSelect(role);
  }

  /**
   * Resolves the effective {from, to} date range for the current form state,
   * based on the selected dateRangeMode (custom / month / year).
   * Returns null (and alerts the user) if the resolved range lands in the future.
   */
  private resolveDateRange(
    formValue: any,
  ): { from: string; to: string } | null {
    let from: string;
    let to: string;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    switch (formValue.dateRangeMode) {
      case "custom":
        from = formValue.from;
        to = formValue.to;
        break;

      case "month": {
        const year = parseInt(formValue.selectedYear, 10);
        const fromMonth = parseInt(formValue.fromMonth, 10);
        const toMonth = parseInt(formValue.toMonth, 10);

        from = new Date(year, fromMonth - 1, 1).toISOString().split("T")[0];

        if (year === currentYear && toMonth === currentMonth) {
          to = today.toISOString().split("T")[0];
        } else {
          const lastDay = new Date(year, toMonth, 0).getDate();
          to = new Date(year, toMonth - 1, lastDay).toISOString().split("T")[0];
        }
        break;
      }

      case "year": {
        const selectedYear = parseInt(formValue.selectedYear, 10);

        from = new Date(selectedYear, 0, 1).toISOString().split("T")[0];

        if (selectedYear === currentYear) {
          to = today.toISOString().split("T")[0];
        } else {
          to = new Date(selectedYear, 11, 31).toISOString().split("T")[0];
        }
        break;
      }

      default:
        from = formValue.from;
        to = formValue.to;
    }

    if (from > this.getTodayDate() || to > this.getTodayDate()) {
      alert("Future dates are not allowed");
      return null;
    }

    return { from, to };
  }

  private buildReportRequest(
    formValue: any,
    from: string,
    to: string,
    page: number,
    pageSize: number,
  ): any {
    const request: any = {
      entityType: formValue.entityType,
      from,
      to,
      page,
      pageSize,
    };

    if (formValue.reportType === "ENTITY") {
      request.entityId = formValue.entityId;
    }

    if (formValue.portalId) {
      request.portalId = formValue.portalId;
    }

    if (formValue.transactionType !== "All") {
      request.transactionType = formValue.transactionType;
    }

    if (formValue.status !== "All") {
      request.status = formValue.status;
    }

    if (formValue.searchTerm) {
      request.searchTerm = formValue.searchTerm;
    }

    return request;
  }

  /**
   * Load report.
   * @param resetPage When true (new search / filter change), pagination resets to page 1.
   *                  When false (pagination click / auto-refresh), the current page is kept.
   */
  loadReport(resetPage: boolean = true): void {
    if (this.reportForm.invalid) {
      this.markFormGroupTouched(this.reportForm);
      return;
    }

    const formValue = this.reportForm.getRawValue();
    const range = this.resolveDateRange(formValue);
    if (!range) {
      return;
    }

    if (resetPage) {
      this.currentPage = 1;
    }

    this.loading = true;
    this.hasSearched = true;

    this.errorMessage = "";
    this.successMessage = "";

    this.reports = [];

    const request = this.buildReportRequest(
      formValue,
      range.from,
      range.to,
      this.currentPage - 1,
      this.itemsPerPage,
    );

    this.isPortalReport = !!request.portalId;

    console.log("REPORT REQUEST", request);

    this.transactionService.getEntityReport(request).subscribe({
      next: (res: any) => {
        const data = res?.data || res;

        const records = data?.entities || data?.entity?.records || [];

        this.reports = records.map((record: any) => {
          return {
            ...record,
          };
        });

        console.log("TABLE RECORDS", this.reports);

        this.fromDate = range.from;
        this.toDate = range.to;

        this.totalCount =
          data?.count ?? data?.totalCount ?? this.reports.length;
        this.totalPages = Math.max(
          1,
          Math.ceil(this.totalCount / this.itemsPerPage),
        );

        if (this.reports.length === 0) {
          this.errorMessage = "No transactions found for the selected criteria";
        } else {
          this.successMessage = `Found ${this.totalCount} transactions`;
        }

        this.loading = false;
      },

      error: (err) => {
        console.error("REPORT ERROR", err);

        this.loading = false;

        this.snackBar.show(
          err.error?.message || "Failed to generate report",
          false,
        );
      },
    });
  }

  showDetails(entity: any): void {
    this.showModal = true;
    this.loadingShow = true;
    this.showResponse = null;
    this.activeEntity = entity;

    const formValue = this.reportForm.getRawValue();
    const request: any = {
      entityId:
        formValue.reportType === "ENTITY"
          ? formValue.entityId
          : formValue.portalId,
      entityType: formValue.entityType.toUpperCase(),
      from: this.fromDate,
      to: this.toDate,
      dataEntityId: entity.id,
    };

    this.transactionService.getEntityReports(request).subscribe({
      next: (res: any) => {
        console.log("REPORT RESPONSE", res);

        const response = res?.data;

        this.showResponse = {
          ...response,
          entity: {
            ...response.entity,
            records: (response.entity?.records || []).map((record: any) => ({
              ...record,

              selfPercentage:
                (Number(record.totalPercentage) || 0) -
                (Number(record.distributedPercentage) || 0),

              selfAmount:
                Math.abs(Number(record.amount) || 0) -
                (Number(record.distributedAmount) || 0),
            })),
          },
        };

        console.log("SHOW RESPONSE", this.showResponse);

        this.loadingShow = false;
      },
      error: (err) => {
        this.loadingShow = false;
        this.snackBar.show(err.error?.message, false);
      },
    });
  }

  exportReport(format: "CSV" | "PDF"): void {
    if (!this.hasSearched || this.totalCount === 0) {
      alert("No data available to export");
      return;
    }

    if (this.exporting) {
      return;
    }

    if (this.reports.length >= this.totalCount) {
      this.runExport(format, this.reports);
      return;
    }

    const formValue = this.reportForm.getRawValue();
    const range = this.resolveDateRange(formValue);
    if (!range) {
      return;
    }

    this.exporting = true;

    const request = this.buildReportRequest(
      formValue,
      range.from,
      range.to,
      0,
      this.totalCount,
    );

    this.transactionService.getEntityReport(request).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const records = data?.entities || data?.entity?.records || [];
        this.exporting = false;
        this.runExport(format, records);
      },
      error: (err) => {
        this.exporting = false;
        this.snackBar.show(
          err.error?.message || "Failed to export report",
          false,
        );
      },
    });
  }

  private runExport(format: string, records: any[]): void {
    if (!records || records.length === 0) {
      alert("No data available to export");
      return;
    }

    if (format === "CSV") {
      this.exportToCSV(records);
    } else if (format === "PDF") {
      this.exportToPDF(records);
    }
  }

  /**
   * Column definitions shared by CSV and PDF export, mirroring exactly what
   * is shown in the on-screen table (including the Portal Opening / Portal
   * Closing swap when a specific portal is selected).
   */
  private getExportColumns(): {
    header: string;
    value: (r: any) => any;
    currency?: boolean;
  }[] {
    return [
      { header: "Transaction Date", value: (r) => r.createdAt || "" },
      { header: "Fund ID", value: (r) => r.fundDisplayId || "" },
      { header: "Type", value: (r) => r.fundsType || "" },
      { header: "Category", value: (r) => r.category || "" },
      { header: "Currency", value: (r) => r.currency || "" },
      { header: "Rate", value: (r) => r.rate ?? 0 },
      { header: "Total Amount", value: (r) => r.totalAmount ?? 0 },
      { header: "Transaction Amount", value: (r) => r.transactionAmount ?? 0 },
      {
        header: "Currency Exchange Amount",
        value: (r) => r.currencyExchangeAmount ?? 0,
      },
      { header: "Total %", value: (r) => r.totalPercentage ?? 0 },
      { header: "Distributed %", value: (r) => r.distributedPercentage ?? 0 },
      { header: "Self %", value: (r) => r.selfPercentage ?? 0 },
      { header: "Penalty %", value: (r) => r.penaltyPercentage ?? 0 },
      {
        header: this.isPortalReport ? "Portal Opening" : "Opening Balance",
        value: (r) =>
          (this.isPortalReport ? r.portalBefore : r.balanceBefore) ?? 0,
        currency: true,
      },
      {
        header: "Distributed Amount",
        value: (r) => r.distributedAmount ?? 0,
        currency: true,
      },
      {
        header: "Self Amount",
        value: (r) => r.selfAmount ?? 0,
        currency: true,
      },
      {
        header: "Extra Amount",
        value: (r) => r.extraAmount ?? 0,
        currency: true,
      },
      {
        header: this.isPortalReport ? "Portal Closing" : "Closing Balance",
        value: (r) =>
          (this.isPortalReport ? r.portalAfter : r.balanceAfter) ?? 0,
        currency: true,
      },
      { header: "Remark", value: (r) => r.remark || "" },
    ];
  }

  private exportToCSV(records: any[]): void {
    const columns = this.getExportColumns();
    const headers = columns.map((c) => c.header);

    const escapeCsv = (val: any): string => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = records.map((record) =>
      columns.map((c) => escapeCsv(c.value(record))),
    );

    const csvContent =
      headers.join(",") + "\n" + rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "transaction-history-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private exportToPDF(records: any[]): void {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text("Transaction History Report", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `${this.fromDate} to ${this.toDate}  |  ${records.length} records`,
      14,
      21,
    );

    const columns = this.getExportColumns();
    const head = columns.map((c) => c.header);

    const tableData = records.map((record) =>
      columns.map((c) => {
        const val = c.value(record);
        return c.currency ? this.formatCurrency(val) : val;
      }),
    );

    autoTable(doc, {
      head: [head],
      body: tableData,
      startY: 26,
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save("transaction-history-report.pdf");
  }

  resetForm(): void {
    this.reportForm.get("entityId")?.enable();

    this.reportForm.reset({
      reportType: "ENTITY",
      entityType: "AGENT",
      dateRangeMode: "custom",
      from: new Date(new Date().setDate(new Date().getDate() - 7))
        .toISOString()
        .split("T")[0],
      to: new Date().toISOString().split("T")[0],
      transactionType: "All",
      status: "All",
      entityId: "",
      portalId: "",
    });
    this.reports = [];
    this.hasSearched = false;
    this.errorMessage = "";
    this.successMessage = "";
    this.isPortalReport = false;
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalCount = 0;

    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);

    this.fromDate = this.reportForm.get("from")?.value;
    this.toDate = this.reportForm.get("to")?.value;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadReport(false);
  }

  /**
   * Compact page-number list for the pagination bar, e.g. [1, '...', 4, 5, 6, '...', 20]
   */
  getPageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 1;
    const range: (number | string)[] = [];

    if (total <= 1) {
      return [1];
    }

    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    range.push(1);
    if (left > 2) {
      range.push("...");
    }
    for (let i = left; i <= right; i++) {
      range.push(i);
    }
    if (right < total - 1) {
      range.push("...");
    }
    range.push(total);

    return range;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  closeShowModal(): void {
    this.showModal = false;
    this.showResponse = null;
    this.activeEntity = null;
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  getTransactionTypeClass(type: string): string {
    switch (type?.toLowerCase()) {
      case "payin":
        return "bg-blue-100 text-blue-700";
      case "payout":
        return "bg-red-100 text-red-700";
      case "commission":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  formatCurrency(amount: any): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  }

  getMonthRangeError(): boolean {
    return (
      this.reportForm.hasError("monthRangeInvalid") &&
      this.reportForm.get("dateRangeMode")?.value === "month"
    );
  }

  autoRefreshWrapper = () => {
    if (!this.hasSearched) return;
    this.loadReport(false);
  };

  loadPortals(): void {
    this.loadingPortals = true;

    this.portalService.getAllPortal().subscribe({
      next: (res: any) => {
        const list = (res || []).map((item: any) => ({
          id: item.id,
          name: `${item.domain} (${item.comPartName})`,
        }));

        this.portals = [{ id: "", name: "All" }, ...list];

        this.loadingPortals = false;
      },
      error: (err) => {
        this.loadingPortals = false;
        this.portals = [{ id: "", name: "All" }];
        this.snackBar.show(
          err.error?.message || "Failed to load portals",
          false,
        );
      },
    });
  }
}
