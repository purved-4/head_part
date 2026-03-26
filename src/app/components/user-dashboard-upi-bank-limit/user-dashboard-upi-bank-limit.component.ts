import { Component, OnInit } from "@angular/core";
import { UserStateService } from "../../store/user-state.service";
import { BankService } from "../../pages/services/bank.service";
import { UpiService } from "../../pages/services/upi.service";
import { UserService } from "../../pages/services/user.service";
import { SnackbarService } from "../../common/snackbar/snackbar.service";

@Component({
  selector: "app-user-dashboard-upi-bank-limit",
  templateUrl: "./user-dashboard-upi-bank-limit.component.html",
  styleUrls: ["./user-dashboard-upi-bank-limit.component.css"],
})
export class UserDashboardUpiBankLimitComponent implements OnInit {
  currentRoleId: any;
  role: any;
  type: any;
  upis: any[] = [];
  banks: any[] = [];

  // Sorted data arrays
  sortedUpis: any[] = [];
  sortedBanks: any[] = [];

  // Popup control
  showLimitsPopup: boolean = false;
  activeTab: "upi" | "bank" = "upi";
  currentUserId: string | null = "";

  // Limit Time Modal - Common
  showLimitModal: boolean = false;
  editingItem: any = null;
  editingType: "upi" | "bank" = "upi";
  limitDateTime: string = "";
  minLimitDateTime: string = "";
  isSubmittingLimit: boolean = false;

  // Colors based on role
  colors: any = null;

  // Pagination
  pageSize: number = 5;
  upiPage: number = 1;
  bankPage: number = 1;
  Math = Math;
  balance: any;

  constructor(
    private userStateService: UserStateService,
    private bankService: BankService,
    private upiService: UpiService,
    private userService: UserService,
    private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.getData();
    this.activeTab = "upi";
    this.setMinDateTime();
  }

  setMinDateTime() {
    const now = new Date();
    // Set minimum to current time + 5 minutes
    now.setMinutes(now.getMinutes() + 5);
    this.minLimitDateTime = now.toISOString().slice(0, 16);
  }

  // Format existing time for datetime-local input
  formatExistingTime(limitTime: string): string {
    if (!limitTime) return "";
    const date = new Date(limitTime);
    return date.toISOString().slice(0, 16);
  }

  /**
   * Sort function: Descending order - latest future dates first
   * Example: 27 March > 26 March > 25 March > 24 March (future dates)
   * Then past dates: 23 March > 22 March > 21 March (most recent past first)
   * Then null dates at the end
   */
  sortByDateWise(items: any[]): any[] {
    return [...items].sort((a, b) => {
      const timeA = a.limitTime ? new Date(a.limitTime).getTime() : null;
      const timeB = b.limitTime ? new Date(b.limitTime).getTime() : null;
      const now = Date.now();

      // Check if each is future
      const aIsFuture = timeA !== null && timeA > now;
      const bIsFuture = timeB !== null && timeB > now;

      // Future dates come first
      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;

      // Both future: sort by latest expiry first (descending order)
      // So 27 March comes before 25 March
      if (aIsFuture && bIsFuture) {
        return timeB! - timeA!;
      }

      // Both past and both have dates: show most recent past first (descending)
      // So 23 March comes before 21 March
      if (!aIsFuture && !bIsFuture && timeA !== null && timeB !== null) {
        return timeB - timeA;
      }

      // One has date, one is null: put the one with date first
      if (timeA !== null && timeB === null) return -1;
      if (timeA === null && timeB !== null) return 1;

      // Both null: maintain original order
      return 0;
    });
  }

  // Open limit time modal for UPI
  openUpiLimitModal(upi: any) {
    this.editingItem = upi;
    this.editingType = "upi";
    // Pre-fill existing limit time if available
    if (upi.limitTime) {
      this.limitDateTime = this.formatExistingTime(upi.limitTime);
    } else {
      this.limitDateTime = "";
    }
    this.showLimitModal = true;
    this.setMinDateTime();
  }

  // Open limit time modal for Bank
  openBankLimitModal(bank: any) {
    this.editingItem = bank;
    this.editingType = "bank";
    // Pre-fill existing limit time if available
    if (bank.limitTime) {
      this.limitDateTime = this.formatExistingTime(bank.limitTime);
    } else {
      this.limitDateTime = "";
    }
    this.showLimitModal = true;
    this.setMinDateTime();
  }

  // Close limit modal
  closeLimitModal() {
    this.showLimitModal = false;
    this.editingItem = null;
    this.limitDateTime = "";
    this.isSubmittingLimit = false;
  }

  // Submit limit time
  submitLimitTime() {
    if (!this.limitDateTime || !this.editingItem) return;

    const selectedTime = new Date(this.limitDateTime).getTime();
    const nowTime = new Date().getTime();

    if (selectedTime < nowTime) {
      this.snackbar.show("Please select a future date and time", false);
      return;
    }

    this.isSubmittingLimit = true;

    const payload = {
      dateTime: this.limitDateTime,
    };

    const id = this.editingItem.id;

    if (this.editingType === "upi") {
      this.upiService.setLimitTime(id, payload).subscribe({
        next: () => {
          this.snackbar.show("UPI limit time set successfully", true);
          this.closeLimitModal();
          this.isSubmittingLimit = false;
          this.getData(); // Refresh data after update
        },
        error: () => {
          this.snackbar.show("Failed to set UPI limit time", false);
          this.isSubmittingLimit = false;
        },
      });
    } else {
      this.bankService.setLimitTime(id, payload).subscribe({
        next: () => {
          this.snackbar.show("Bank limit time set successfully", true);
          this.closeLimitModal();
          this.isSubmittingLimit = false;
          this.getData(); // Refresh data after update
        },
        error: () => {
          this.snackbar.show("Failed to set Bank limit time", false);
          this.isSubmittingLimit = false;
        },
      });
    }
  }

  // Check if limit time is in future
  isFutureTime(limitTime: string): boolean {
    if (!limitTime) return false;
    const limitDate = new Date(limitTime);
    const currentDate = new Date();
    return limitDate > currentDate;
  }

  getPortalData() {
    this.userService.getUserFullDetail(this.currentUserId).subscribe({
      next: (res) => {
        this.balance = res.entityInfo?.balance || 0;
      },
      error(err) {
        console.log(err);
      },
    });
  }

  getData() {
    // Fetch UPI data
    this.upiService
      .getByEntityIdAndActivePaginated(this.currentRoleId, {
        page: 0,
        size: 100,
        active: true,
      })
      .subscribe(
        (res: any) => {
          console.log("UPI Response:", res);

          const upiData = res.content || res.data?.content || res.data || [];

          // Map and sort the data
          this.upis = upiData.map((r: any) => {
            return {
              id: r.id,
              vpa: r.vpa,
              limitAmount: r.limitAmount,
              limitTime: r.limitTime,
              upi: r.upi,
            };
          });

          // Apply date-wise sorting directly (descending order)
          this.sortedUpis = this.sortByDateWise(this.upis);
          this.upiPage = 1;
        },
        (error) => {
          console.error("Error fetching UPI data:", error);
        },
      );

    // Fetch Bank data
    this.bankService
      .getBankDataWithSubAdminIdAndActivePaginated(this.currentRoleId, {
        page: 0,
        size: 100,
        active: true,
      })
      .subscribe(
        (res: any) => {
          console.log("Bank Response:", res);

          const bankData = res.content || res.data?.content || res.data || [];

          // Map and sort the data
          this.banks = bankData.map((r: any) => {
            return {
              id: r.id,
              accountNumber: r.accountNo,
              limitAmount: r.limitAmount,
              limitTime: r.limitTime,
              bank: r.bank,
            };
          });

          // Apply date-wise sorting directly (descending order)
          this.sortedBanks = this.sortByDateWise(this.banks);
          this.bankPage = 1;
        },
        (error) => {
          console.error("Error fetching Bank data:", error);
        },
      );

    this.getPortalData();
  }

  // Close limits popup
  closeLimitsPopup(): void {
    this.showLimitsPopup = false;
  }

  // Format currency helper
  formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Abbreviated format
  formatAbbreviated(amount: number): string {
    if (amount == null || isNaN(amount)) return "0";

    if (amount < 1000) {
      return amount.toString();
    } else if (amount < 100000) {
      const val = amount / 1000;
      return val % 1 === 0 ? val + "k" : val.toFixed(1) + "k";
    } else if (amount < 10000000) {
      const val = amount / 100000;
      return val % 1 === 0 ? val + "L" : val.toFixed(1) + "L";
    } else {
      const val = amount / 10000000;
      return val % 1 === 0 ? val + "Cr" : val.toFixed(1) + "Cr";
    }
  }

  // Switch tabs
  setActiveTab(tab: "upi" | "bank"): void {
    this.activeTab = tab;
  }

  // Pagination helpers (using sorted data)
  pagedUpis() {
    const start = (this.upiPage - 1) * this.pageSize;
    return this.sortedUpis.slice(start, start + this.pageSize);
  }

  pagedBanks() {
    const start = (this.bankPage - 1) * this.pageSize;
    return this.sortedBanks.slice(start, start + this.pageSize);
  }

  changeUpiPage(delta: number) {
    const max = Math.ceil(this.sortedUpis.length / this.pageSize) || 1;
    this.upiPage = Math.min(Math.max(1, this.upiPage + delta), max);
  }

  changeBankPage(delta: number) {
    const max = Math.ceil(this.sortedBanks.length / this.pageSize) || 1;
    this.bankPage = Math.min(Math.max(1, this.bankPage + delta), max);
  }
}
