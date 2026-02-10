import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { UserStateService } from "../../../store/user-state.service";
import { UtilsServiceService } from "../../../utils/utils-service.service";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserService } from "../../../pages/services/user.service";

@Component({
  selector: 'app-balance-history-report',
  templateUrl: './balance-history-report.component.html',
  styleUrl: './balance-history-report.component.css'
})
export class BalanceHistoryReportComponent implements OnInit {
  // Form
  reportForm: FormGroup;

  // User state
  currentUserId: any;
  currentRole: any;
  currentRoleId: any;
  entityTypes: any;

  // Data loading states
  loading: boolean = false;
  loadingEntities: boolean = false;
  loadingWebsites: boolean = false;
  loadingExport: boolean = false;

  // Data arrays
  entities: any[] = [];
  websites: any[] = [];

  // Snapshot data
  snapshotResult: any = null;
  websiteBalance: number = 0;
  entityBalance: number = 0;

  // Settle operations
  settling: boolean = false;
  settleHistoryLoading: boolean = false;
  settleHistory: any[] = [];

  // Messages and notifications
  successMessage: string | null = null;
  errorMessage: string | null = null;
  infoMessage: string | null = null;

  Math = Math;
  // Pagination for history
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  // Filters
  selectedWebsite: string = "";
  selectedType: string = "";
  selectedStatus: string = "";

  // Chart data (for visualization)
  chartData: any = null;
  showChart: boolean = false;

  constructor(
    private transactionHistoy: TransactionHistoryService,
    private utilService: UtilsServiceService,
    private stateService: UserStateService,
    private fb: FormBuilder,
    private userService: UserService,
  ) {
    this.reportForm = this.fb.group({
      entityType: ["", Validators.required],
      entityId: ["", Validators.required],
      websiteId: ["", Validators.required],
    
      fromDate: ["", Validators.required],
      toDate: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(
      this.stateService.getRole(),
    );

    this.currentUserId = this.stateService.getUserId();
    this.currentRole = this.stateService.getRole();
    this.currentRoleId = this.stateService.getCurrentRoleId();

    this.setDefaultDates();
  }



 

  // --- Settle history (GET) ---
  fetchSettleHistory(): void {
    const entityId = this.reportForm.get("entityId")?.value;
    const websiteId = this.reportForm.get("websiteId")?.value;
    const from = this.reportForm.get("fromDate")?.value;
    const to = this.reportForm.get("toDate")?.value;

    if (!entityId || !websiteId) {
      this.errorMessage = "Select Entity and Website to fetch settle history.";
      return;
    }
    if (!from || !to) {
      this.errorMessage = "Please provide both From and To dates for history.";
      return;
    }

    if (new Date(from) > new Date(to)) {
      this.errorMessage = "From date cannot be after To date.";
      return;
    }

    this.settleHistoryLoading = true;
    this.clearMessages();

    const payload = {
      entityId,
      websiteId,
      fromDate: from,
      toDate: to,
      page: this.currentPage,
      limit: this.itemsPerPage,
    };

    this.transactionHistoy.getSettleHistory(payload).subscribe({
      next: (res: any) => {
        this.settleHistory = this.mapSettleHistoryResponse(res.data || res);
        this.totalItems = res.total || res.count || this.settleHistory.length;
        this.settleHistoryLoading = false;
        this.generateChartData();
        this.showChart = true;
      },
      error: (err) => {
        console.error("Error fetching settle history:", err);
        this.errorMessage =
          err.error?.message || "Failed to load settle history.";
        this.settleHistory = [];
        this.settleHistoryLoading = false;
      },
    });
  }

  // --- Helper Methods ---
  private mapSettleHistoryResponse(res: any): SettleHistoryItem[] {
    const data = Array.isArray(res) ? res : (res?.data ?? []);

    return data.map((item: any) => ({
      id:
        item.id ||
        item.transactionId ||
        Math.random().toString(36).substr(2, 9),
      dateTime:
        item.dateTime ||
        item.createdAt ||
        item.date ||
        new Date().toISOString(),
      entityType: item.entityType || "-",
      entityId: item.entityId || "-",
      websiteId: item.websiteId || "-",
      websiteDomain:
        item.websiteDomain ||
        item.domain ||
        this.websites.find((w) => w.id === item.websiteId)?.name ||
        "Unknown",
      amount: Number(item.amount || 0),
      balanceBefore: Number(
        item.balanceBefore || item.entityBalanceBefore || 0,
      ),
      balanceAfter: Number(item.balanceAfter || item.entityBalanceAfter || 0),
      websiteBefore: Number(
        item.websiteBefore || item.websiteBalanceBefore || 0,
      ),
      websiteAfter: Number(item.websiteAfter || item.websiteBalanceAfter || 0),
      type: item.type || "topup",
      status: item.status || "completed",
      referenceId: item.referenceId || item.id || "-",
      notes: item.notes || "",
      initiatedBy: item.initiatedBy || this.currentUserId,
    }));
  }



  generateChartData(): void {
    if (this.settleHistory.length === 0) return;

    const labels = this.settleHistory
      .map((item) => this.formatDate(item.dateTime))
      .reverse();

    const amounts = this.settleHistory.map((item) => item.amount).reverse();
    const entityBalances = this.settleHistory
      .map((item) => item.balanceAfter)
      .reverse();

    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: "Settlement Amount",
          data: amounts,
          borderColor: "#4F46E5",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Entity Balance",
          data: entityBalances,
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }

  onRoleChange(role: string): void {
    this.applyEntityAutoSelect(role);
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
      this.entities = [this.currentRoleId];
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

  onEntityChange(): void {
    const entityId = this.reportForm.get("entityId")?.value;
    const entityType = this.reportForm.get("entityType")?.value;

    if (!entityId || !entityType) {
      this.websites = [];
      return;
    }

    this.loadingWebsites = true;
    this.utilService
      .getWebsiteByRoleIdAndRoleName(entityId, entityType)
      .subscribe({
        next: (res: any) => {
          if (Array.isArray(res)) {
            this.websites = res.map((item) => ({
              id: item.websiteId,
              name: item.websiteDomain || item.domain || item.id,
            }));
          } else if (res?.data) {
            this.websites = res.data.map((item: any) => ({
              id: item.websiteId,
              name: item.websiteDomain || item.domain || item.id,
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

  getTodayDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  clearForm(): void {
    this.reportForm.get("entityId")?.enable();
    this.reportForm.reset();
    this.setDefaultDates();
    this.entities = [];
    this.websites = [];
    this.snapshotResult = null;
    this.websiteBalance = 0;
    this.entityBalance = 0;
    this.settleHistory = [];
    this.chartData = null;
    this.showChart = false;
    this.clearMessages();
  }

  setDefaultDates(): void {
    const today = this.formatDate(new Date());
    const lastWeek = this.addDays(7);

    this.reportForm.patchValue({
      date: today,
      fromDate: lastWeek,
      toDate: today,
    
    });
  }

  exportToCSV(): void {
    if (this.settleHistory.length === 0) {
      this.errorMessage = "No data to export.";
      return;
    }

    this.loadingExport = true;
    const headers = [
      "Date",
      "Transaction ID",
      "Website",
      "Entity",
      "Amount",
      "Type",
      "Status",
      "Entity Balance Before",
      "Entity Balance After",
      "Website Balance Before",
      "Website Balance After",
    ];
    const rows = this.settleHistory.map((item) => [
      this.formatDate(item.dateTime),
      item.id,
      item.websiteDomain,
      `${item.entityType} (${item.entityId})`,
      item.amount.toFixed(2),
      item.type,
      item.status,
      item.balanceBefore.toFixed(2),
      item.balanceAfter.toFixed(2),
      item.websiteBefore.toFixed(2),
      item.websiteAfter.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
   
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.loadingExport = false;
    this.infoMessage = "CSV file downloaded successfully.";
  }

  getFilteredHistory(): SettleHistoryItem[] {
    let filtered = this.settleHistory;

    if (this.selectedWebsite) {
      filtered = filtered.filter((item) =>
        item.websiteDomain
          .toLowerCase()
          .includes(this.selectedWebsite.toLowerCase()),
      );
    }

    if (this.selectedType && this.selectedType !== "all") {
      filtered = filtered.filter((item) => item.type === this.selectedType);
    }

    if (this.selectedStatus && this.selectedStatus !== "all") {
      filtered = filtered.filter((item) => item.status === this.selectedStatus);
    }

    return filtered;
  }

  getTotalAmount(): number {
    const filtered = this.getFilteredHistory();
    return filtered.reduce((total, item) => total + item.amount, 0);
  }

  getAverageAmount(): number {
    const filtered = this.getFilteredHistory();
    return filtered.length > 0 ? this.getTotalAmount() / filtered.length : 0;
  }

  getUniqueWebsites(): string[] {
    return [...new Set(this.settleHistory.map((item) => item.websiteDomain))];
  }

  private clearMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
    this.infoMessage = null;
  }

  // Pagination
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

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  setCustomRange(days: number): void {
  

    

    this.fetchSettleHistory();
  }

  viewDetails(item: SettleHistoryItem): void {
    // Implement modal or detailed view
    console.log("Viewing details for:", item);
    // You can implement a modal here
    const modalContent = `
    Transaction ID: ${item.id}
    Amount: ${item.amount}
    Website: ${item.websiteDomain}
    Entity: ${item.entityType} (${item.entityId})
    Status: ${item.status}
    Date: ${item.dateTime}
    
    Balance Changes:
    - Entity: ${item.balanceBefore} → ${item.balanceAfter}
    - Website: ${item.websiteBefore} → ${item.websiteAfter}
  `;
    alert(modalContent);
  }

  private formatDate(date: string | Date, withTime = false): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    if (!withTime) {
      return `${yyyy}-${mm}-${dd}`;
    }

    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  private addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return this.formatDate(d);
}
}

interface SettleHistoryItem {
  id: string;
  dateTime: string;
  entityType: string;
  entityId: string | number;
  websiteId: string | number;
  websiteDomain: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  websiteBefore: number;
  websiteAfter: number;
  type: string;
  status: string;
  referenceId: string;
  notes?: string;
  initiatedBy?: string;
}
