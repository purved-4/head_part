import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { Subscription, of } from "rxjs";
import { catchError, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { Subject } from "rxjs";

import { CryptoService } from "../../../pages/services/crypto.service";
import { UserStateService } from "../../../store/user-state.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";
import { ActivatedRoute } from "@angular/router";
import { MultimediaService } from "../../../pages/services/multimedia.service";
import { log } from "util";

type StatusString = "active" | "inactive" | string;

interface CryptoAccount {
  id: string;
  paymentMethod: string;
  walletAddress: string;
  limitAmount: string;
  holderName: string;
  currency: string;
  fttAcceptance: boolean;
  limitTime: string | null;
  status: boolean;
  cryptoTime: string | null;
  deleted: boolean;
  entityType: string;
  entityId: string;
  isCryptoActive?: boolean;
  qrImagePath?: string | null; // 👈 naya field
  ranges?: any[];
}

@Component({
  selector: "app-crypto-management",
  templateUrl: "./crypto-management.component.html",
  styleUrl: "./crypto-management.component.css",
})
export class CryptoManagementComponent implements OnInit, OnDestroy {
  cryptoAccounts: CryptoAccount[] = [];
  totalElements = 0;
  totalPagesCount = 0;
  loading = false;
  showInventoryModal = false;

  currency: any = "";
  selectedModeData: string = "";
  private currencySub!: Subscription;
  private modeSub!: Subscription;

  searchTerm = "";
  draftSearchTerm = "";
  maxLimit: any | null = null;
  draftMaxLimit: number | null = null;
  statusFilter: string = "all";
  draftStatusFilter: string = "all";
  paymentMethodFilter: string = "all";
  draftPaymentMethodFilter: string = "all";

  // ===== EDIT ACCOUNT MODAL =====
  showEditAccountModal = false;
  editAccountForm: {
    walletAddress: string;
    holderName: string;
    limitAmount: any;
    fttAcceptance: boolean;
  } = {
    walletAddress: "",
    holderName: "",
    limitAmount: null,
    fttAcceptance: true,
  };
  accountBeingEdited: CryptoAccount | null = null;
  isSavingEdit = false;

  // ===== QR (Edit modal) =====
  @ViewChild("editQrWrapper", { static: false }) editQrWrapper!: ElementRef;
  originalWalletAddress = "";
  existingQrPreviewUrl: string | null = null; // existing QR (from server)
  newQrData: string = ""; // triggers <qrcode> render for regeneration
  newQrPreviewUrl: string | null = null; // single preview: generated (data URL) or uploaded (blob URL)
  newGeneratedQrFile: File | null = null; // file that will be sent to backend (generated OR uploaded)
  isGeneratingNewQr = false;
  qrUploadError = "";
  /** true when newQrPreviewUrl is an object URL (from file upload) and must be revoked */
  private newQrPreviewIsBlobUrl = false;

  get walletAddressChanged(): boolean {
    return (
      this.editAccountForm.walletAddress.trim() !==
      this.originalWalletAddress.trim()
    );
  }

  get canSaveEdit(): boolean {
    // agar wallet address change hua hai to naya QR generate/upload karna zaroori hai
    if (this.walletAddressChanged && !this.newGeneratedQrFile) {
      return false;
    }
    return true;
  }

  // ===== QR (Table thumbnail + preview modal) =====
  qrImageUrls: { [accountId: string]: string } = {};
  qrImageLoading: { [accountId: string]: boolean } = {};
  showQrPreviewModal = false;
  selectedQrAccount: CryptoAccount | null = null;

  // pagination
  currentPage = 1;
  pageSize = 6;
  pageNumbers: number[] = [];
  Math = Math;

  capacityPopupTop = 0;
  capacityPopupLeft = 0;
  selectedCapacityAccount: any = null;
  selectedId!: string;
  selectedPortalId!: string;
  selectedPayinId!: string;
  selectedMode!: "UPI" | "BANK" | "ERC20" | "TRC20" | "SPL" | "BEP20" | "OMNI";
  viewMode: "table" | "grid" = "table";

  showLimitModal = false;
  editingAccount: CryptoAccount | null = null;
  isSubmittingLimit = false;
  limitDateTime: any;
  minLimitDateTime: string = "";

  monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  viewYear!: number;
  viewMonth!: number;
  pickerSelectedDay!: number;
  pickerSelectedMonth!: number;
  pickerSelectedYear!: number;
  pickerHour!: number;
  pickerMinute!: string;
  pickerAmPm: "AM" | "PM" = "AM";
  calendarCells: any[] = [];

  showStatusModal = false;
  selectedAccount: CryptoAccount | null = null;
  confirmStatusChecked = false;
  pendingToggleValue = false;
  toggleEvent: any = null;

  isDeleteConfirmVisible = false;
  deleteCandidate: CryptoAccount | null = null;

  activeActionDropdown: string | null = null;

  currentRoleId: any;
  currentUserId: any;
  role: any;
  showCapacityModal: boolean = false;

  private countdownInterval: any;
  private subs = new Subscription();
  private searchSubject = new Subject<string>();
  private queryParamsSub!: Subscription;

  cryptoPaymentMethods: string[] = ["ERC20", "TRC20", "SPL", "BEP20", "OMNI"];

  constructor(
    private cryptoService: CryptoService,
    private userStateService: UserStateService,
    private snack: SnackbarService,
    private currencyBehaviourService: CurrencyBehaviourService,
    private route: ActivatedRoute,
    private multiMedia: MultimediaService, // 👈 apna actual service inject karo
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.queryParamsSub = this.route.queryParams.subscribe((params) => {
      if (params["paymentMethod"]) {
        this.paymentMethodFilter = params["paymentMethod"];
        this.draftPaymentMethodFilter = params["paymentMethod"];
      }
      if (params["currency"]) {
        this.currency = params["currency"];
      }
      if (this.currentRoleId) {
        this.currentPage = 1;
        this.fetchCryptoAccounts();
      }
    });

    this.currencySub = this.currencyBehaviourService
      .getCurrency()
      .subscribe((res) => {
        if (!res) return;
        this.currency = res.currency;
      });

    this.modeSub = this.currencyBehaviourService.getMode().subscribe((res) => {
      if (!res) return;
      this.selectedModeData = res;
    });

    this.searchSubject
      .pipe(debounceTime(600), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm = value;
        this.currentPage = 1;
        this.fetchCryptoAccounts();
      });

    this.countdownInterval = setInterval(() => {
      this.cryptoAccounts = [...this.cryptoAccounts];
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.currencySub) this.currencySub.unsubscribe();
    if (this.modeSub) this.modeSub.unsubscribe();
    if (this.queryParamsSub) this.queryParamsSub.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.currencyBehaviourService.resetAll();

    // memory leak se bachne ke liye blob URLs revoke karo
    Object.values(this.qrImageUrls).forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    if (this.existingQrPreviewUrl) {
      try {
        URL.revokeObjectURL(this.existingQrPreviewUrl);
      } catch {}
    }
    this.revokeNewQrPreviewIfBlob();
  }

  fetchCryptoAccounts(): void {
    if (!this.currentRoleId) {
      return;
    }

    this.loading = true;

    const paymentMethod =
      this.paymentMethodFilter && this.paymentMethodFilter !== "all"
        ? this.paymentMethodFilter
        : undefined;

    const sub = this.cryptoService
      .getCrypto(this.currentRoleId, this.role, paymentMethod)
      .pipe(
        catchError((err) => {
          console.error("CRYPTO FETCH ERROR:", err);
          this.loading = false;
          return of([]);
        }),
      )
      .subscribe((res: any) => {
        this.loading = false;

        const rows: any[] = Array.isArray(res?.content) ? res.content : [];

        let mapped: CryptoAccount[] = rows.map((r: any) => ({
          id: r.id,
          paymentMethod: r.paymentMethod ?? "",
          walletAddress: r.walletAddress ?? "",
          limitAmount: r.limitAmount ?? "",
          holderName: r.holderName ?? "",
          currency: r.currency ?? "",
          fttAcceptance: r.fttAcceptance ?? true,
          limitTime: r.limitTime ?? null,
          status: !!r.status,
          cryptoTime: r.cryptoTime ?? null,
          deleted: !!r.deleted,
          entityType: r.entityType ?? "",
          entityId: r.entityId ?? "",
          isCryptoActive: !!r.status,
          ranges: r.ranges,
          qrImagePath: r.qrImagePath ?? null, // 👈 naya field
        }));

        if (this.searchTerm?.trim()) {
          const term = this.searchTerm.trim().toLowerCase();
          mapped = mapped.filter(
            (a) =>
              (a.walletAddress || "").toLowerCase().includes(term) ||
              (a.holderName || "").toLowerCase().includes(term) ||
              (a.paymentMethod || "").toLowerCase().includes(term),
          );
        }

        if (this.statusFilter === "active") {
          mapped = mapped.filter((a) => a.status);
        } else if (this.statusFilter === "inactive") {
          mapped = mapped.filter((a) => !a.status);
        }

        if (this.maxLimit && this.maxLimit > 0) {
          mapped = mapped.filter(
            (a) => Number(a.limitAmount || 0) <= this.maxLimit,
          );
        }

        mapped = mapped.filter((a) => !a.deleted);

        mapped.sort((a, b) => {
          const aTime = a.limitTime ? new Date(a.limitTime).getTime() : 0;
          const bTime = b.limitTime ? new Date(b.limitTime).getTime() : 0;
          return bTime - aTime;
        });

        this.totalElements = mapped.length;
        this.totalPagesCount = Math.max(
          1,
          Math.ceil(mapped.length / this.pageSize),
        );

        if (this.currentPage > this.totalPagesCount) {
          this.currentPage = 1;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.cryptoAccounts = mapped.slice(start, start + this.pageSize);

        this.updatePageNumbers();

        // is page ke accounts ke liye QR thumbnails load karo
        this.loadQrThumbnails();
      });

    this.subs.add(sub);
  }

  // ---------------- QR THUMBNAILS (table) ----------------
  private loadQrThumbnails(): void {
    this.cryptoAccounts.forEach((account) => {
      if (!account.qrImagePath) return;
      if (this.qrImageUrls[account.id]) return; // already loaded

      this.qrImageLoading[account.id] = true;

      const sub = this.multiMedia
        .getPrivateImage(account.qrImagePath)
        .pipe(
          catchError(() => {
            this.qrImageLoading[account.id] = false;
            return of(null);
          }),
        )
        .subscribe((url) => {
          this.qrImageLoading[account.id] = false;
          if (url) {
            this.qrImageUrls[account.id] = url;
          }
        });

      this.subs.add(sub);
    });
  }

  // ---------------- QR PREVIEW MODAL (table -> click) ----------------
  openQrPreviewModal(account: CryptoAccount): void {
    if (!account.qrImagePath) {
      this.snack.show("No QR available for this account", false);
      return;
    }
    this.selectedQrAccount = account;
    this.showQrPreviewModal = true;
  }

  closeQrPreviewModal(): void {
    this.showQrPreviewModal = false;
    this.selectedQrAccount = null;
  }

  downloadQrImage(): void {
    if (!this.selectedQrAccount) return;
    const url = this.qrImageUrls[this.selectedQrAccount.id];
    if (!url) {
      this.snack.show("QR not loaded yet", false);
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = `qr_${this.selectedQrAccount.paymentMethod}_${this.selectedQrAccount.walletAddress.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  isAccountActive(account: CryptoAccount): boolean {
    const now = Date.now();
    const limitTime = account.limitTime
      ? new Date(account.limitTime).getTime()
      : null;
    const cryptoTime = account.cryptoTime
      ? new Date(account.cryptoTime).getTime()
      : null;

    const status = account.status
      ? true
      : cryptoTime != null
        ? cryptoTime > now
        : false;

    return !!(limitTime !== null && limitTime > now && status);
  }

  get activeFilters(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.statusFilter && this.statusFilter !== "all") count++;
    if (this.paymentMethodFilter && this.paymentMethodFilter !== "all") count++;
    if (this.maxLimit !== null && this.maxLimit > 0) count++;
    return count;
  }

  getCryptoRemainingTime(account: CryptoAccount): string {
    if (!account?.cryptoTime) return "";
    const diff = new Date(account.cryptoTime).getTime() - Date.now();
    if (diff <= 0) return "";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }

  isFutureLimitTime(limitTime: string | null | undefined): boolean {
    if (!limitTime) return false;
    return new Date(limitTime).getTime() > new Date().getTime();
  }

  onSearchInput(value: string) {
    this.searchSubject.next(value);
  }

  applyFilters(): void {
    this.searchTerm = this.draftSearchTerm;
    this.maxLimit = this.draftMaxLimit;
    this.statusFilter = this.draftStatusFilter;
    this.paymentMethodFilter = this.draftPaymentMethodFilter;

    this.currentPage = 1;
    this.fetchCryptoAccounts();
  }

  resetFilters(): void {
    this.searchTerm = "";
    this.maxLimit = null;
    this.statusFilter = "all";

    this.draftSearchTerm = "";
    this.draftMaxLimit = null;
    this.draftStatusFilter = "all";

    this.currentPage = 1;
    this.fetchCryptoAccounts();
  }

  clearLimitFilter(): void {
    this.maxLimit = null;
    this.draftMaxLimit = null;
    this.currentPage = 1;
    this.fetchCryptoAccounts();
  }

  clearSearchFilter(): void {
    this.searchTerm = "";
    this.draftSearchTerm = "";
    this.currentPage = 1;
    this.fetchCryptoAccounts();
  }

  totalPages(): number {
    return this.totalPagesCount;
  }

  private updatePageNumbers(): void {
    const total = this.totalPages();
    const current = this.currentPage;
    const pages: number[] = [];
    const start = Math.max(1, current - 1);
    const end = Math.min(total, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    this.pageNumbers = pages;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchCryptoAccounts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
      this.fetchCryptoAccounts();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage) {
      this.currentPage = page;
      this.fetchCryptoAccounts();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchCryptoAccounts();
  }

  toggleView(mode: "table" | "grid") {
    this.viewMode = mode;
  }

  toggleActionDropdown(accountId: string, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.activeActionDropdown =
      this.activeActionDropdown === accountId ? null : accountId;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest(".action-dropdown-wrapper")) {
      this.activeActionDropdown = null;
    }
  }

  maskWallet(address: string): string {
    if (!address) return "-";
    if (address.length <= 8) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  copyText(value: string, message: string): void {
    if (!value) return;
    navigator.clipboard.writeText(value);
    this.snack.show(message, true);
  }

  openLimitModal(account: CryptoAccount) {
    this.editingAccount = account;
    this.showLimitModal = true;

    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.pickerSelectedDay = now.getDate();
    this.pickerSelectedMonth = now.getMonth();
    this.pickerSelectedYear = now.getFullYear();

    let h = now.getHours();
    this.pickerAmPm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    this.pickerHour = h;
    this.pickerMinute = String(now.getMinutes()).padStart(2, "0");

    this.buildCalendar();
  }

  buildCalendar(): void {
    this.calendarCells = [];
    const today = new Date();
    const todayMid = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(
      this.viewYear,
      this.viewMonth + 1,
      0,
    ).getDate();
    const prevDays = new Date(this.viewYear, this.viewMonth, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      this.calendarCells.push({
        day: prevDays - firstDay + 1 + i,
        date: null,
        isPast: true,
        isToday: false,
        isSelected: false,
        isOtherMonth: true,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(this.viewYear, this.viewMonth, d);
      const isPast = cellDate < todayMid;
      const isToday = cellDate.getTime() === todayMid.getTime();
      const isSelected =
        d === this.pickerSelectedDay &&
        this.viewMonth === this.pickerSelectedMonth &&
        this.viewYear === this.pickerSelectedYear;
      this.calendarCells.push({
        day: d,
        date: cellDate,
        isPast,
        isToday,
        isSelected,
        isOtherMonth: false,
      });
    }
    const remaining = 42 - this.calendarCells.length;
    for (let d = 1; d <= remaining; d++) {
      this.calendarCells.push({
        day: d,
        date: null,
        isPast: true,
        isToday: false,
        isSelected: false,
        isOtherMonth: true,
      });
    }
  }

  selectCalendarDay(cell: any): void {
    if (!cell.date || cell.isPast || cell.isOtherMonth) return;
    this.pickerSelectedDay = cell.day;
    this.pickerSelectedMonth = this.viewMonth;
    this.pickerSelectedYear = this.viewYear;
    this.buildCalendar();
  }

  prevMonth(): void {
    if (this.isCurrentMonthView()) return;
    if (--this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear--;
    }
    this.buildCalendar();
  }

  nextMonth(): void {
    if (++this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear++;
    }
    this.buildCalendar();
  }

  isCurrentMonthView(): boolean {
    const now = new Date();
    return (
      this.viewMonth === now.getMonth() && this.viewYear === now.getFullYear()
    );
  }

  clampPickerHour(): void {
    let h = Number(this.pickerHour);
    if (isNaN(h) || h < 1) h = 1;
    if (h > 12) h = 12;
    this.pickerHour = h;
  }

  clampPickerMinute(): void {
    let m = Number(this.pickerMinute);
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;
    this.pickerMinute = String(m).padStart(2, "0");
  }

  submitLimitTime() {
    let hour = this.pickerHour;
    if (this.pickerAmPm === "PM" && hour !== 12) hour += 12;
    if (this.pickerAmPm === "AM" && hour === 12) hour = 0;

    const selected = new Date(
      this.pickerSelectedYear,
      this.pickerSelectedMonth,
      this.pickerSelectedDay,
      hour,
      Number(this.pickerMinute),
      0,
    );

    if (!this.editingAccount) return;

    const selectedTime = selected.getTime();
    const nowTime = Date.now();

    if (selectedTime < nowTime) {
      this.snack.show("Please select a future date and time", false);
      return;
    }

    this.isSubmittingLimit = true;

    const payload = {
      dateTime: selected,
    };

    const id = this.editingAccount.id;

    this.cryptoService.setLimitTime(id, payload).subscribe({
      next: () => {
        this.snack.show("Limit time set successfully", true);
        this.closeLimitModal();
        this.isSubmittingLimit = false;
        this.fetchCryptoAccounts();
      },
      error: (err) => {
        this.snack.show(
          err?.error?.message || "Failed to set limit time",
          false,
        );
        this.isSubmittingLimit = false;
      },
    });
  }

  closeLimitModal() {
    this.showLimitModal = false;
    this.limitDateTime = "";
    this.minLimitDateTime = "";
    this.editingAccount = null;
  }

  openStatusModal(account: CryptoAccount, event: any): void {
    event.preventDefault();
    this.selectedAccount = account;
    this.pendingToggleValue = event.target.checked;
    this.toggleEvent = event;
    this.confirmStatusChecked = false;
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    if (this.toggleEvent) {
      this.toggleEvent.target.checked = !this.pendingToggleValue;
    }
    this.confirmStatusChecked = false;
    this.showStatusModal = false;
    this.selectedAccount = null;
    this.toggleEvent = null;
  }

  confirmStatusChange(): void {
    if (!this.selectedAccount) return;

    if (!this.confirmStatusChecked) {
      this.snack.show(
        "Please confirm by checking the checkbox before proceeding",
        false,
      );
      return;
    }

    this.cryptoService
      .toggleCryptoStatus(
        this.selectedAccount.id,
        this.selectedAccount.paymentMethod,
      )
      .subscribe({
        next: (res: any) => {
          this.snack.show(res?.message || "Status updated successfully", true);

          this.showStatusModal = false;
          this.fetchCryptoAccounts();
        },
        error: (err: any) => {
          this.snack.show(
            err?.error?.message || "Failed to update status",
            false,
          );
        },
      });
  }

  openDeleteConfirm(account: CryptoAccount, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.deleteCandidate = account;
    this.isDeleteConfirmVisible = true;
  }

  closeDeleteConfirm(): void {
    this.deleteCandidate = null;
    this.isDeleteConfirmVisible = false;
  }

  executeDelete(): void {
    if (!this.deleteCandidate) return;
    const id = this.deleteCandidate.id;

    this.cryptoService.deleteCrypto(id, {}).subscribe({
      next: (res: any) => {
        this.snack.show(res?.message || "Crypto account deleted", true);
        this.closeDeleteConfirm();
        this.fetchCryptoAccounts();
      },
      error: (err) => {
        this.snack.show(
          err?.error?.message || "Failed to delete the account",
          false,
        );
        this.closeDeleteConfirm();
      },
    });
  }

  openAddCryptoModal() {
    this.showInventoryModal = true;
  }

  closeInventoryModal() {
    this.showInventoryModal = false;
  }

  openCapacityPreview(account: any, event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    this.selectedCapacityAccount = account;

    const popupWidth = 280;
    const rows = account?.ranges?.length || 0;
    const popupHeight = Math.max(120, rows * 56 + 70);

    let left = rect.left + rect.width / 2 - popupWidth / 2;
    let top = rect.bottom + 8;

    if (top + popupHeight > window.innerHeight) {
      top = rect.top - popupHeight - 8;
    }
    if (top < 10) {
      top = 10;
    }
    if (left < 10) {
      left = 10;
    }
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }

    this.capacityPopupTop = top;
    this.capacityPopupLeft = left;
  }

  closeCapacityPopup() {
    this.selectedCapacityAccount = null;
  }

  openCapacity(item: any) {
    this.selectedId = item.id;
    this.selectedPayinId = item.id;
    this.selectedMode = item.paymentMethod;
    this.showCapacityModal = true;
  }

  // ---------------- EDIT ACCOUNT MODAL ----------------
  openEditAccountModal(account: CryptoAccount, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.accountBeingEdited = account;
    this.originalWalletAddress = account.walletAddress;

    this.editAccountForm = {
      walletAddress: account.walletAddress,
      holderName: account.holderName,
      limitAmount: account.limitAmount,
      fttAcceptance: account.fttAcceptance,
    };

    // reset QR regeneration/upload state
    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();
    this.newQrPreviewUrl = null;
    this.newGeneratedQrFile = null;
    this.isGeneratingNewQr = false;
    this.qrUploadError = "";

    // existing QR load karo (agar hai)
    this.existingQrPreviewUrl = null;
    if (account.qrImagePath) {
      // agar table me already load ho chuka hai to wahi reuse karo
      if (this.qrImageUrls[account.id]) {
        this.existingQrPreviewUrl = this.qrImageUrls[account.id];
      } else {
        const sub = this.multiMedia
          .getPrivateImage(account.qrImagePath)
          .pipe(catchError(() => of(null)))
          .subscribe((url: any) => {
            this.existingQrPreviewUrl = url;
          });
        this.subs.add(sub);
      }
    }

    this.showEditAccountModal = true;
  }

  closeEditAccountModal() {
    this.showEditAccountModal = false;
    this.accountBeingEdited = null;
    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();
    this.newQrPreviewUrl = null;
    this.newGeneratedQrFile = null;
    this.qrUploadError = "";
  }

  onEditWalletAddressChange(): void {
    // wallet address change hote hi purana "new QR" state clear karo,
    // taaki user dobara generate/upload kare naye address ke liye
    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();
    this.newQrPreviewUrl = null;
    this.newGeneratedQrFile = null;
    this.qrUploadError = "";
  }

  /** Naye generate ya upload se pehle purana "new QR" preview clear/revoke karo */
  private revokeNewQrPreviewIfBlob(): void {
    if (this.newQrPreviewIsBlobUrl && this.newQrPreviewUrl) {
      try {
        URL.revokeObjectURL(this.newQrPreviewUrl);
      } catch {}
    }
    this.newQrPreviewIsBlobUrl = false;
  }

  /** User apni current session ka "new QR" discard karke wapas current/original QR pe aa sakta hai */
  discardNewQr(): void {
    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();
    this.newQrPreviewUrl = null;
    this.newGeneratedQrFile = null;
    this.qrUploadError = "";
  }

  // naya QR generate karo current (edited) wallet address se
  generateNewQrForEdit(): void {
    const address = this.editAccountForm.walletAddress.trim();

    if (!address) {
      this.snack.show("Please enter a wallet address first.", false);
      return;
    }

    this.qrUploadError = "";
    this.revokeNewQrPreviewIfBlob();

    this.isGeneratingNewQr = true;
    this.newQrData = address;

    const filename = `qr_${this.accountBeingEdited?.paymentMethod}_${Date.now()}.png`;

    setTimeout(() => {
      const canvas = this.editQrWrapper?.nativeElement?.querySelector(
        "canvas",
      ) as HTMLCanvasElement;

      if (!canvas) {
        this.snack.show("QR not rendered yet", false);
        this.isGeneratingNewQr = false;
        return;
      }

      this.newQrPreviewUrl = canvas.toDataURL("image/png");
      this.newQrPreviewIsBlobUrl = false; // data URL, not an object URL

      canvas.toBlob((blob) => {
        if (blob) {
          this.newGeneratedQrFile = new File([blob], filename, {
            type: "image/png",
          });
          this.snack.show(
            "New QR generated. Click 'Save Changes' to apply.",
            true,
          );
        } else {
          this.snack.show("Failed to generate QR", false);
        }
        this.isGeneratingNewQr = false;
      }, "image/png");
    }, 300);
  }

  // wallet ke liye QR image manually upload karo (generate ka alternative)
  uploadNewQrForEdit(event: Event): void {
    this.qrUploadError = "";
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      this.qrUploadError = "Only PNG, JPG or WEBP images are allowed.";
      input.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      this.qrUploadError = "File must be smaller than 5MB.";
      input.value = "";
      return;
    }

    // purana generated/uploaded preview hata do — ek time pe ek hi "new" QR
    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();

    this.newGeneratedQrFile = file;
    this.newQrPreviewUrl = URL.createObjectURL(file);
    this.newQrPreviewIsBlobUrl = true;

    this.snack.show("QR image uploaded. Click 'Save Changes' to apply.", true);
    input.value = "";
  }

  saveEditAccount() {
    if (!this.accountBeingEdited) return;

    if (!this.editAccountForm.walletAddress?.trim()) {
      this.snack.show("Wallet address is required", false);
      return;
    }
    if (!this.editAccountForm.holderName?.trim()) {
      this.snack.show("Holder name is required", false);
      return;
    }
    if (
      !this.editAccountForm.limitAmount ||
      Number(this.editAccountForm.limitAmount) <= 0
    ) {
      this.snack.show("Enter a valid limit amount", false);
      return;
    }

    if (this.walletAddressChanged && !this.newGeneratedQrFile) {
      this.snack.show(
        "Wallet address changed. Please generate or upload a new QR before saving.",
        false,
      );
      return;
    }

    this.isSavingEdit = true;

    const payload: any = {
      entityId: this.accountBeingEdited.entityId,
      entityType: this.accountBeingEdited.entityType,

      walletAddress: this.editAccountForm.walletAddress.trim(),
      holderName: this.editAccountForm.holderName.trim(),
      limitAmount: this.editAccountForm.limitAmount,
      fttAcceptance: this.editAccountForm.fttAcceptance,
    };
    console.log(payload);

    const formData = new FormData();
    formData.append(
      "dto",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );

    if (this.newGeneratedQrFile) {
      // naya QR generate/upload hua -> uska file bhejo
      formData.append(
        "file",
        this.newGeneratedQrFile,
        this.newGeneratedQrFile.name,
      );
    } else {
      formData.append(
        "file",
        new Blob([], { type: "application/octet-stream" }),
        "",
      );
    }
    console.log(formData);

    const body: any = formData;

    this.cryptoService
      .updateCrypto(this.accountBeingEdited.id, body)
      .subscribe({
        next: (res: any) => {
          this.snack.show(res?.message || "Account updated successfully", true);
          this.isSavingEdit = false;
          this.closeEditAccountModal();
          this.fetchCryptoAccounts();
        },
        error: (err) => {
          this.snack.show(
            err?.error?.message || "Failed to update account",
            false,
          );
          this.isSavingEdit = false;
        },
      });
  }
}
