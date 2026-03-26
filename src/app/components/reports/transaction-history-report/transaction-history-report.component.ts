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

@Component({
  selector: "app-transaction-history-report",
  templateUrl: "./transaction-history-report.component.html",
  styleUrls: ["./transaction-history-report.component.css"],
})
export class TransactionHistoryReportComponent implements OnInit {
  reportForm!: FormGroup;

  // Report state
  loading = false;
  hasSearched = false;
  errorMessage = "";
  successMessage = "";

  // Report data
  reports: any[] = [];
  fromDate!: string;
  toDate!: string;
  totalCount = 0;

  // Modal state
  showModal = false;
  loadingShow = false;
  showResponse: any = null;
  activeEntity: any = null;

  // Entity selection
  loadingEntities = false;
  entities: any[] = [];

  // Entity types mapping
  entityTypes: any = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // Filter options
  filterOptions = {
    transactionTypes: ["All", "topup", "payout", "Commission", "Reward"],
    statuses: ["All", "Success", "Failed", "Pending"],
    portals: ["All", "Portal1", "Portal2", "Portal3"],
  };

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
    private fb: FormBuilder,
    private transactionService: TransactionHistoryService,
    private userService: UserService,
    private utilService: UtilsServiceService,
    private stateService: UserStateService,
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

    // Apply auto selection if entityType matches currentRole on load
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

  setupFormListeners(): void {
    // When entity type changes, either auto-select for current role OR fetch entities
    this.reportForm.get("entityType")?.valueChanges.subscribe((role) => {
      this.applyEntityAutoSelect(role);
    });

    // When report type changes, adjust validators
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

    // When date range mode changes, update validators
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
      dateRangeMode: "custom", // default mode
    });

    this.fromDate = fromISO;
    this.toDate = toISO;
  }

  getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * If selected role equals the current user's role, set entityId to currentRoleId and disable the select.
   * ComPartwise enable the control and fetch available entities for the role.
   */
  applyEntityAutoSelect(role: string): void {
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
      // Auto‑select current user
      this.reportForm.patchValue({ entityId: this.currentRoleId });
      this.reportForm.get("entityId")?.disable();

      // Use a placeholder name – replace with actual name if available later
      this.entities = [{ id: this.currentRoleId, name: "Current User" }];
    } else {
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      this.fetchEntitiesForRole(role);
    }
  }

  // Fetch entities based on role
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
          this.entities = Array.isArray(res) ? res : res?.data?.data || [];
          this.loadingEntities = false;
        },
        error: (err) => {
          console.error("Error fetching entities:", err);
          this.entities = [];
          this.loadingEntities = false;
          this.errorMessage = "Failed to load entities";
        },
      });
  }

  // (Deprecated name onRoleChange kept for compatibility if template calls it)
  onRoleChange(role: string): void {
    this.applyEntityAutoSelect(role);
  }

  // Load report
  loadReport(): void {
    if (this.reportForm.invalid) {
      this.markFormGroupTouched(this.reportForm);
      return;
    }

    const formValue = this.reportForm.getRawValue();

    // Compute actual from and to dates based on mode
    let from: string, to: string;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    switch (formValue.dateRangeMode) {
      case "custom":
        from = formValue.from;
        to = formValue.to;
        break;
      case "month":
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
      case "year":
        const selYear = parseInt(formValue.selectedYear, 10);
        from = new Date(selYear, 0, 1).toISOString().split("T")[0];
        if (selYear === currentYear) {
          to = today.toISOString().split("T")[0];
        } else {
          to = new Date(selYear, 11, 31).toISOString().split("T")[0];
        }
        break;
      default:
        from = formValue.from;
        to = formValue.to;
    }

    // Future date check
    if (from > this.getTodayDate() || to > this.getTodayDate()) {
      alert("Future dates are not allowed");
      return;
    }

    this.loading = true;
    this.hasSearched = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.reports = [];

    // Prepare request based on report type
    const request: any = {
      entityType: formValue.entityType,
      from: from,
      to: to,
    };

    if (formValue.reportType === "ENTITY") {
      request.entityId = formValue.entityId;
    } else {
      request.portalId = formValue.portalId;
    }

    // Add filters if not 'All'
    if (formValue.transactionType !== "All") {
      request.transactionType = formValue.transactionType;
    }
    if (formValue.status !== "All") {
      request.status = formValue.status;
    }
    if (formValue.searchTerm) {
      request.searchTerm = formValue.searchTerm;
    }

    this.transactionService.getEntityReport(request).subscribe({
      next: (res: any) => {
        const data = res?.data || res;

        this.reports = data?.entities || data || [];
        this.fromDate = from;
        this.toDate = to;
        this.totalCount = data?.count || this.reports.length;
        this.totalPages = Math.ceil(this.totalCount / this.itemsPerPage);

        if (this.reports.length === 0) {
          this.errorMessage = "No transactions found for the selected criteria";
        } else {
          this.successMessage = `Found ${this.totalCount} transactions`;
        }

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || "Failed to fetch report. Please try again.";
      },
    });
  }

  // Show entity details
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
        this.showResponse = res?.data || res;
        this.loadingShow = false;
      },
      error: (err) => {
        this.loadingShow = false;
        this.errorMessage = "Failed to load details";
      },
    });
  }

  // Export report
  exportReport(format: string): void {
    if (!this.reports || this.reports.length === 0) {
      alert("No data available to export");
      return;
    }

    if (format === "CSV") {
      this.exportToCSV();
    } else if (format === "PDF") {
      this.exportToPDF();
    }
  }

  private exportToCSV(): void {
    const headers = [
      "Entity Name",
      "Type",
      "Opening Balance",
      "Closing Balance",
    ];

    const rows = this.reports.map((entity) => [
      entity.name || "",
      entity.type || "",
      entity.openingBalance || 0,
      entity.closingBalance || 0,
    ]);

    let csvContent =
      headers.join(",") + "\n" + rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "transaction-history-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private exportToPDF(): void {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Transaction History Report", 14, 15);

    const tableData = this.reports.map((entity) => [
      entity.name || "",
      entity.type || "",
      this.formatCurrency(entity.openingBalance || 0),
      this.formatCurrency(entity.closingBalance || 0),
    ]);

    autoTable(doc, {
      head: [["Entity Name", "Type", "Opening", "Closing"]],
      body: tableData,
      startY: 25,
    });

    doc.save("transaction-history-report.pdf");
  }

  // Reset form
  resetForm(): void {
    // re-enable entityId control first so reset can set value properly
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
    });
    this.reports = [];
    this.hasSearched = false;
    this.errorMessage = "";
    this.successMessage = "";

    // re-apply auto selection in case AGENT matches currentRole
    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);

    // update component-level dates
    this.fromDate = this.reportForm.get("from")?.value;
    this.toDate = this.reportForm.get("to")?.value;
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // You can implement pagination API call here if needed
    }
  }

  // Utility function to mark all fields as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Close modal
  closeShowModal(): void {
    this.showModal = false;
    this.showResponse = null;
    this.activeEntity = null;
  }

  // Get status badge class
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

  // Get transaction type class
  getTransactionTypeClass(type: string): string {
    switch (type?.toLowerCase()) {
      case "topup":
        return "bg-blue-100 text-blue-700";
      case "payout":
        return "bg-red-100 text-red-700";
      case "commission":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  // Format currency
  formatCurrency(amount: any): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  }

  // Get month range error
  getMonthRangeError(): boolean {
    return (
      this.reportForm.hasError("monthRangeInvalid") &&
      this.reportForm.get("dateRangeMode")?.value === "month"
    );
  }
}
