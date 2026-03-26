import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";

@Component({
  selector: "app-branch-data-history",
  templateUrl: "./branch-data-history.component.html",
  styleUrls: ["./branch-data-history.component.css"],
})
export class BranchDataHistoryComponent implements OnInit {
  reportForm: FormGroup;
  loading = false;

  settleHistory: any[] = []; // Store raw API response

  successMessage: string | null = null;
  errorMessage: string | null = null;
  infoMessage: string | null = null;

  currentPage = 1;
  itemsPerPage = 8;
  totalItems = 0;

  selectedPortal = "";

  // Modal
  selectedJson: any = null;
  showModal = false;
  modalTitle = "";
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private transactionHistory: TransactionHistoryService,
  ) {
    this.reportForm = this.fb.group({
      fromDate: ["", Validators.required],
      toDate: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    this.setDefaultDates();
  }

  fetchSettleHistory(): void {
    const { fromDate, toDate } = this.reportForm.value;

    if (!fromDate || !toDate) {
      this.errorMessage = "Please select both From and To dates.";
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      this.errorMessage = "From date cannot be after To date.";
      return;
    }

    this.loading = true;
    this.clearMessages();

    const payload = {
      fromDate,
      toDate,
      page: this.currentPage - 1,
      limit: this.itemsPerPage,
    };

    this.transactionHistory.getBranchDataHistory(payload).subscribe({
      next: (res: any) => {
        this.settleHistory = res?.data?.content || [];
        this.totalItems = res?.data?.totalElements || 0;
        this.loading = false;
        this.successMessage = `Loaded ${this.settleHistory.length} records`;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message || "Failed to fetch history.";
        this.loading = false;
        this.settleHistory = [];
      },
    });
  }

  clearForm(): void {
    this.reportForm.reset();
    this.setDefaultDates();
    this.settleHistory = [];
    this.clearMessages();
    this.currentPage = 1;
  }

  setDefaultDates(): void {
    const today = this.formatDate(new Date());
    const lastWeek = this.addDays(7);
    this.reportForm.patchValue({
      fromDate: lastWeek,
      toDate: today,
    });
  }

  exportToCSV(): void {
    if (this.settleHistory.length === 0) {
      this.errorMessage = "No data to export.";
      return;
    }

    const headers = [
      "Date",
      "Transaction ID",
      "Portal",
      "Amount",
      "UTR",
      "User ID",
      "Mode",
      "Type",
      "Account No",
      "UPI",
      "Status",
      "Category",
    ];

    const rows = this.settleHistory.map((item) => {
      let payloadData: any = {};
      try {
        payloadData = item.payload ? JSON.parse(item.payload) : {};
      } catch (e) {
        console.error("Failed to parse payload:", item.payload);
      }

      return [
        this.formatDate(item.createdAt),
        item.id,
        item.portalDomain,
        payloadData.amount || 0,
        payloadData.utr || "-",
        payloadData.userId || "-",
        payloadData.mode || "-",
        payloadData.type || "-",
        payloadData.accountNo || "-",
        payloadData.upi || "-",
        item.processed ? "Processed" : "Pending",
        item.category || "-",
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `branch-data-history-${this.formatDate(new Date())}.csv`;
    link.click();
    this.infoMessage = "CSV downloaded successfully";
  }

  getFilteredHistory(): any[] {
    if (!this.selectedPortal) return this.settleHistory;
    return this.settleHistory.filter((i) =>
      i.portalDomain.toLowerCase().includes(this.selectedPortal.toLowerCase()),
    );
  }

  nextPage(): void {
    if (this.currentPage * this.itemsPerPage < this.totalItems) {
      this.currentPage++;
      this.fetchSettleHistory();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchSettleHistory();
    }
  }

  // === JSON Modal Functions ===
  showCommonJson(item: any): void {
    let payloadData: any = {};

    try {
      payloadData = item.payload ? JSON.parse(item.payload) : {};
    } catch (e) {
      console.error("Payload parse error", e);
      payloadData = { error: "Failed to parse payload" };
    }

    this.selectedJson = payloadData;
    this.modalTitle = "Common JSON - Parsed Payload";
    this.showModal = true;
  }

  showFullPayload(item: any): void {
    // Show raw payload exactly as received from backend
    this.selectedJson = item;
    this.modalTitle = "Full Payload - Raw Response";
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedJson = null;
  }

  copyToClipboard(): void {
    const jsonString = JSON.stringify(this.selectedJson, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      this.infoMessage = "JSON copied to clipboard!";
      setTimeout(() => {
        this.infoMessage = null;
      }, 2000);
    });
  }

  private clearMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
    this.infoMessage = null;
  }

  private formatDate(date: string | Date): string {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  private addDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return this.formatDate(d);
  }

  getPayloadData(item: any): any {
    try {
      return item.payload ? JSON.parse(item.payload) : {};
    } catch (e) {
      return {};
    }
  }
}
