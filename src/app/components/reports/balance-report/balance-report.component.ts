import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { finalize } from "rxjs/operators";
import { UserStateService } from "../../../store/user-state.service";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";

type StatusValue = "credit" | "debit" | "both";
type DateRangeMode = "custom" | "month" | "year";

interface StatusOption {
  label: string;
  value: StatusValue;
}

interface MonthOption {
  name: string;
  value: number;
}

interface TransactionRow {
  id: string;
  entityId: string;
  entityType: string;
  fundId: string;
  fundType: string;
  transactionType: string;
  beforeBalance: number;
  afterBalance: number;
  transactionAmount: number;
  totalAvailable: number;
  rewardAmount: number;
  createdAt: string | null;
}

@Component({
  selector: "app-balance-report",
  templateUrl: "./balance-report.component.html",
  styleUrl: "./balance-report.component.css",
})
export class BalanceReportComponent implements OnInit {
  filterForm!: FormGroup;
  isStatusDropdownOpen = false;

  statusOptions: StatusOption[] = [
    { label: "Credit", value: "credit" },
    { label: "Debit", value: "debit" },
    { label: "Both", value: "both" },
  ];

  months: MonthOption[] = [
    { name: "January", value: 1 },
    { name: "February", value: 2 },
    { name: "March", value: 3 },
    { name: "April", value: 4 },
    { name: "May", value: 5 },
    { name: "June", value: 6 },
    { name: "July", value: 7 },
    { name: "August", value: 8 },
    { name: "September", value: 9 },
    { name: "October", value: 10 },
    { name: "November", value: 11 },
    { name: "December", value: 12 },
  ];

  years: number[] = [];

  // Entity is resolved internally from the logged-in session.
  // It is intentionally NOT part of the reactive form / UI.
  private currentEntityId: any = "";

  tableData: TransactionRow[] = [];
  loading = false;
  error = false;
  totalRecords = 0;
  page = 0;
  pageSize = 10;
  searched = false;

  /**
   * The status filter that was ACTUALLY used for the last successful
   * search. Column visibility (Credit / Debit) and row splitting are
   * driven by this — NOT by the live dropdown value — so the table only
   * changes once the user clicks Search and results come back.
   */
  appliedStatus: StatusValue = "both";

  // Export state (separate spinners so CSV/PDF buttons don't block each other)
  exportingCsv = false;
  exportingPdf = false;
  exportError = false;

  constructor(
    private fb: FormBuilder,
    private userStateService: UserStateService,
    private transactionService: TransactionHistoryService,
  ) {}

  ngOnInit(): void {
    this.currentEntityId = this.userStateService.getCurrentEntityId();

    const currentYear = new Date().getFullYear();
    this.years = Array.from({ length: 6 }, (_, i) => currentYear - i);

    const today = this.toDateInputValue(new Date());
    const weekAgo = this.toDateInputValue(this.addDays(new Date(), -7));

    this.filterForm = this.fb.group({
      status: ["both"],
      dateRangeMode: ["custom"],
      from: [weekAgo, Validators.required],
      to: [today, Validators.required],
      fromMonth: [""],
      toMonth: [""],
      selectedYear: [""],
    });
    // NOTE: no auto-fetch here. Default "last 1 week" is only pre-filled
    // into the form; the API is called only when the user clicks Search
    // (onSubmit) or uses Prev/Next pagination after a search has run.
  }

  // ---------- Status dropdown ----------

  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  closeStatusDropdown(): void {
    this.isStatusDropdownOpen = false;
  }

  selectStatus(value: StatusValue): void {
    this.filterForm.get("status")?.setValue(value);
    this.isStatusDropdownOpen = false;
  }

  get statusLabel(): string {
    const selected: StatusValue = this.filterForm.get("status")?.value;
    return (
      this.statusOptions.find((opt) => opt.value === selected)?.label ??
      "Select status"
    );
  }

  /** Live value of the dropdown (used only for the filter UI itself). */
  get statusValue(): StatusValue {
    return this.filterForm.get("status")?.value ?? "both";
  }

  // Column visibility, driven purely by the status filter that was
  // actually searched with — NOT the live dropdown selection.
  get showCreditColumn(): boolean {
    return this.appliedStatus === "credit" || this.appliedStatus === "both";
  }

  get showDebitColumn(): boolean {
    return this.appliedStatus === "debit" || this.appliedStatus === "both";
  }

  // ---------- Date range mode ----------

  get dateRangeMode(): DateRangeMode {
    return this.filterForm.get("dateRangeMode")?.value ?? "custom";
  }

  setDateRangeMode(mode: DateRangeMode): void {
    this.filterForm.get("dateRangeMode")?.setValue(mode);
    this.applyDynamicValidators(mode);
  }

  private applyDynamicValidators(mode: DateRangeMode): void {
    const from = this.filterForm.get("from");
    const to = this.filterForm.get("to");
    const fromMonth = this.filterForm.get("fromMonth");
    const toMonth = this.filterForm.get("toMonth");
    const selectedYear = this.filterForm.get("selectedYear");

    [from, to, fromMonth, toMonth, selectedYear].forEach((c) =>
      c?.clearValidators(),
    );

    if (mode === "custom") {
      from?.setValidators(Validators.required);
      to?.setValidators(Validators.required);
    } else if (mode === "month") {
      fromMonth?.setValidators(Validators.required);
      toMonth?.setValidators(Validators.required);
      selectedYear?.setValidators(Validators.required);
    } else if (mode === "year") {
      selectedYear?.setValidators(Validators.required);
    }

    [from, to, fromMonth, toMonth, selectedYear].forEach((c) =>
      c?.updateValueAndValidity(),
    );
  }

  getMonthRangeError(): boolean {
    const { dateRangeMode, fromMonth, toMonth } = this.filterForm.getRawValue();
    if (dateRangeMode !== "month") return false;
    if (!fromMonth || !toMonth) return false;
    return Number(fromMonth) > Number(toMonth);
  }

  getTodayDate(): string {
    return this.toDateInputValue(new Date());
  }

  // Resolves whatever mode is active into a concrete { from, to } pair
  // (yyyy-MM-dd) that the API understands.
  private resolveDateRange(): { from: string; to: string } | null {
    const { dateRangeMode, from, to, fromMonth, toMonth, selectedYear } =
      this.filterForm.getRawValue();

    if (dateRangeMode === "custom") {
      return { from, to };
    }

    if (dateRangeMode === "month") {
      if (!fromMonth || !toMonth || !selectedYear) return null;
      const year = Number(selectedYear);
      const start = new Date(year, Number(fromMonth) - 1, 1);
      const end = new Date(year, Number(toMonth), 0); // last day of "to" month
      return {
        from: this.toDateInputValue(start),
        to: this.toDateInputValue(end),
      };
    }

    if (dateRangeMode === "year") {
      if (!selectedYear) return null;
      const year = Number(selectedYear);
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return {
        from: this.toDateInputValue(start),
        to: this.toDateInputValue(end),
      };
    }

    return null;
  }

  // ---------- Search / fetch ----------

  onSubmit(): void {
    if (this.getMonthRangeError()) {
      return;
    }
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const range = this.resolveDateRange();
    if (!range) {
      this.filterForm.markAllAsTouched();
      return;
    }

    this.page = 0;
    this.fetchReport();
  }

  fetchReport(): void {
    const range = this.resolveDateRange();
    if (!range) {
      return;
    }

    const { status } = this.filterForm.getRawValue();

    const payload = {
      entityId: this.currentEntityId,
      status,
      fromDate: range.from,
      toDate: range.to,
      page: this.page,
      pageSize: this.pageSize,
    };

    this.loading = true;
    this.error = false;
    this.searched = true;

    const request$ = this.transactionService.getEntityBalanceSearch(payload);

    if (!request$) {
      this.loading = false;
      this.error = true;
      return;
    }

    request$.subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res)
          ? res
          : (res?.data ?? res?.content ?? []);

        this.tableData = rows;
        this.totalRecords = Array.isArray(res)
          ? res.length
          : (res?.totalRecords ?? rows.length);

        // Only now — once results are actually back — do we let the
        // Credit/Debit columns reflect the filter that was searched.
        this.appliedStatus = status;
        this.loading = false;
      },
      error: (err) => {
        console.error("Balance report fetch failed", err);
        this.loading = false;
        this.error = true;
        this.tableData = [];
      },
    });
  }

  onPageChange(direction: "next" | "prev"): void {
    if (
      direction === "next" &&
      (this.page + 1) * this.pageSize < this.totalRecords
    ) {
      this.page++;
      this.fetchReport();
    } else if (direction === "prev" && this.page > 0) {
      this.page--;
      this.fetchReport();
    }
  }

  resetFilters(): void {
    const today = this.toDateInputValue(new Date());
    const weekAgo = this.toDateInputValue(this.addDays(new Date(), -7));

    this.filterForm.reset({
      status: "both",
      dateRangeMode: "custom",
      from: weekAgo,
      to: today,
      fromMonth: "",
      toMonth: "",
      selectedYear: "",
    });
    this.tableData = [];
    this.searched = false;
    this.error = false;
    this.page = 0;
    this.appliedStatus = "both";
  }

  // ---------- Row-level credit / debit split ----------
  // When status = both, a row is either a credit or a debit movement.
  // The column that doesn't apply to that row is shown as "-".

  isCredit(row: TransactionRow): boolean {
    return row.afterBalance >= row.beforeBalance;
  }

  creditAmount(row: TransactionRow): string {
    if (this.appliedStatus === "debit") {
      return "-";
    }
    return this.isCredit(row)
      ? "+" + this.formatAmount(Math.abs(row.transactionAmount))
      : "-";
  }

  debitAmount(row: TransactionRow): string {
    if (this.appliedStatus === "credit") {
      return "-";
    }
    return !this.isCredit(row)
      ? "-" + this.formatAmount(Math.abs(row.transactionAmount))
      : "-";
  }

  // ---------- Display helpers ----------

  formatAmount(value: number | null | undefined): string {
    if (value === null || value === undefined) return "-";
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatDate(value: string | null): string {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatLabel(value: string | null | undefined): string {
    if (!value) return "-";
    return value
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // ---------- Export ----------
  // IMPORTANT: exports must contain the FULL filtered result set, not
  // just the page currently on screen. So before building the file we
  // re-query the API for the same filters with a page size big enough
  // to cover every matching record.

  private fetchAllRecordsForExport(
    onSuccess: (rows: TransactionRow[]) => void,
    onError: () => void,
  ): void {
    const range = this.resolveDateRange();
    if (!range) {
      onError();
      return;
    }

    const { status } = this.filterForm.getRawValue();

    const payload = {
      entityId: this.currentEntityId,
      status,
      fromDate: range.from,
      toDate: range.to,
      page: 0,
      pageSize: Math.max(this.totalRecords, this.pageSize, 1),
    };

    const request$ = this.transactionService.getEntityBalanceSearch(payload);
    if (!request$) {
      onError();
      return;
    }

    request$.subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res)
          ? res
          : (res?.data ?? res?.content ?? []);
        onSuccess(rows);
      },
      error: (err) => {
        console.error("Export fetch failed", err);
        onError();
      },
    });
  }

  exportCsv(): void {
    if (!this.tableData.length || this.exportingCsv) return;

    this.exportingCsv = true;
    this.exportError = false;

    this.fetchAllRecordsForExport(
      (rows) => {
        this.buildCsv(rows);
        this.exportingCsv = false;
      },
      () => {
        this.exportingCsv = false;
        this.exportError = true;
      },
    );
  }

  private buildCsv(rows: TransactionRow[]): void {
    const headers = [
      "Sr No",
      "Transaction Date",
      "Entity Type",
      "Transaction Type",
      "Opening Balance",
    ];

    if (this.showCreditColumn) headers.push("Credit");
    if (this.showDebitColumn) headers.push("Debit");
    headers.push("Closing Balance");

    const dataRows = rows.map((row, index) => {
      const line: any[] = [
        index + 1,
        this.formatDate(row.createdAt),
        this.formatLabel(row.entityType),
        this.formatLabel(row.transactionType),
        this.formatAmount(row.beforeBalance),
      ];

      if (this.showCreditColumn) line.push(this.creditAmount(row));
      if (this.showDebitColumn) line.push(this.debitAmount(row));
      line.push(this.formatAmount(row.afterBalance));

      return line;
    });

    const csv = [headers, ...dataRows]
      .map((r) =>
        r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction-report-${new Date().getTime()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.tableData.length || this.exportingPdf) return;

    this.exportingPdf = true;
    this.exportError = false;

    this.fetchAllRecordsForExport(
      (rows) => {
        this.buildPdf(rows);
        this.exportingPdf = false;
      },
      () => {
        this.exportingPdf = false;
        this.exportError = true;
      },
    );
  }

  private buildPdf(rows: TransactionRow[]): void {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);
    doc.text("Transaction Report", 14, 14);

    doc.setFontSize(9);
    doc.text(`Generated : ${new Date().toLocaleString()}`, 14, 21);
    doc.text(`Total Records : ${rows.length}`, 14, 26);

    const headers: any[] = [
      "Sr No",
      "Transaction Date",
      "Entity Type",
      "Transaction Type",
      "Opening Balance",
    ];

    if (this.showCreditColumn) headers.push("Credit");
    if (this.showDebitColumn) headers.push("Debit");
    headers.push("Closing Balance");

    const body = rows.map((row, index) => {
      const data: any[] = [
        index + 1,
        this.formatDate(row.createdAt),
        this.formatLabel(row.entityType),
        this.formatLabel(row.transactionType),
        this.formatAmount(row.beforeBalance),
      ];

      if (this.showCreditColumn) data.push(this.creditAmount(row));
      if (this.showDebitColumn) data.push(this.debitAmount(row));
      data.push(this.formatAmount(row.afterBalance));

      return data;
    });

    autoTable(doc, {
      head: [headers],
      body,
      startY: 32,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: "center",
      },
      headStyles: {
        fillColor: [21, 68, 116], // #154474
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    doc.save(`transaction-report-${new Date().getTime()}.pdf`);
  }
}
