import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Subscription, of, Subject } from "rxjs";
import { catchError, debounceTime, distinctUntilChanged } from "rxjs/operators";

import { BankService } from "../../../pages/services/bank.service";
import { UpiService } from "../../../pages/services/upi.service";
import { CryptoService } from "../../../pages/services/crypto.service";
import { UserStateService } from "../../../store/user-state.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { MultimediaService } from "../../../pages/services/multimedia.service";

type ItemType = "BANK" | "UPI" | string; // TRC20 / ERC20 / SPL / BEP20 / OMNI / etc.

interface InventoryItem {
  id: string;
  type: ItemType;
  entityType: string;
  entityId: string;
  currency: string;
  limitAmount: string;
  remainingLimitAmount: any;
  status: boolean;
  fttAcceptance: boolean;
  partialPayinEnabled: boolean;
  liveAssigned: boolean;
  limitTime: string | null;
  ranges: any[];
  qrImagePath: string | null;
  qrImageUrl?: string | null;

  // bank-only
  accountNo?: string | null;
  accountHolderName?: string | null;
  bankCode?: string | null;
  bankName?: string | null;
  accountType?: string | null;
  bankTime?: string | null;
  upiCount?: any;

  // upi-only
  vpa?: string | null;
  upiTime?: string | null;
  accountHolder?: string | null;

  // crypto-only
  walletAddress?: string | null;
  cryptoTime?: string | null;
  holderName?: string | null;

  displayAddress: string;
}

@Component({
  selector: "app-inventory-management",
  templateUrl: "./inventory-management.component.html",
  styleUrl: "./inventory-management.component.css",
})
export class InventoryManagementComponent implements OnInit, OnDestroy {
  // ---------- RAW + FILTERED (client side only) ----------
  allItems: InventoryItem[] = [];
  filteredItems: InventoryItem[] = [];
  pagedItems: InventoryItem[] = [];

  loading = false;
  viewMode: "table" | "grid" = "table";

  // ---------- CURRENCY / MODE (no routing, no separate currency API) ----------
  currencies: string[] = [];
  selectedCurrency: any = null; // { currency: 'INR' } shape, kept for template reuse
  availableModes: string[] = []; // sare unique "type" jo API se aaye (BANK/UPI/TRC20...)
  selectedMode: string = "all";
  selectedLimitAccount: any;
  // ---------- FILTERS ----------
  searchTerm = "";
  draftSearchTerm = "";
  private searchSubject = new Subject<string>();
  maxLimit: number | null = null;
  draftMaxLimit: number | null = null;
  statusFilter: string = "all";
  draftStatusFilter: string = "all";

  // ---------- PAGINATION (client side) ----------
  currentPage = 1;
  pageSize = 6;
  totalElements = 0;
  totalPagesCount = 0;
  pageNumbers: number[] = [];
  Math = Math;

  currentRoleId: any;
  currentUserId: any;
  role: any;

  showInventoryModal = false;

  private subs = new Subscription();
  private countdownInterval: any;

  qrImageUrls: { [id: string]: string } = {};
  qrImageLoading: { [id: string]: boolean } = {};

  showQrPreviewModal = false;
  selectedQrItem: InventoryItem | null = null;

  // ---------- LIMIT TIME MODAL ----------
  showLimitModal = false;
  editingItem: InventoryItem | null = null;
  isSubmittingLimit = false;
  minLimitDateTime = "";
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

  // ---------- STATUS CONFIRM MODAL ----------
  showStatusModal = false;
  selectedItem: InventoryItem | null = null;
  confirmStatusChecked = false;
  pendingToggleValue = false;
  toggleEvent: any = null;

  // ---------- CAPACITY POPUP / MODAL ----------
  selectedCapacityAccount: any = null;
  capacityPopupTop = 0;
  capacityPopupLeft = 0;
  showCapacityModal = false;
  selectedId!: string;
  selectedPortalId!: string;
  selectedPayinId!: string;
  capacityMode: any;
  hoveredLimitAccount: InventoryItem | null = null;

  tooltipPosition = {
    x: 0,
    y: 0,
  };

  hoverTimeout: any;
  // ---------- DELETE CONFIRM ----------
  isDeleteConfirmVisible = false;
  deleteCandidate: InventoryItem | null = null;

  activeActionDropdown: string | null = null;

  // ===================================================================
  //  BANK — VIEW/EDIT DETAILS MODAL (app-bank-details)
  // ===================================================================
  showBankDetailsModal = false;
  selectedBankAccount: InventoryItem | null = null;

  // ===================================================================
  //  BANK ROW → "Add UPI" / "View UPI" (sirf BANK type ke liye)
  // ===================================================================
  showAddUpiModal = false;
  isAddingUpi = false;
  addUpiForm!: FormGroup;
  selectedBank: InventoryItem | null = null;
  qrMode: "generate" | "upload" = "generate";
  selectedImage: string | null = null;
  qrData: string | null = null;
  generatedFile: File | null = null;
  manualQrFile: File | null = null;
  capacityRanges: {
    minRange: number | null;
    maxRange: number | null;
    quantity: number | null;
  }[] = [{ minRange: null, maxRange: null, quantity: null }];

  @ViewChild("qrcodeElem", { static: false }) qrcodeElem!: ElementRef;

  // ===================================================================
  //  UPI — EDIT / UPDATE MODAL
  // ===================================================================
  showUpdateModal = false;
  editingUpi: any;
  updateForm: any = {
    vpa: "",
    limitAmount: "",
    fttAcceptance: true,
    partialPayinEnabled: true,
  };
  originalVpa = "";
  vpaChanged = false;
  newQrGenerated = false;
  updateQrMode: "generate" | "upload" = "generate";
  updateQrData: string | null = null;
  generatedUpdateFile: File | null = null;
  updateManualQrFile: File | null = null;
  updateSelectedImage: string | null = null;
  isGeneratingUpdateQr = false;
  updateQrError = "";
  isSubmitting = false;

  @ViewChild("updateQrcodeElem", { static: false, read: ElementRef })
  updateQrcodeElem!: ElementRef;

  private vpaPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  // ===================================================================
  //  CRYPTO — EDIT ACCOUNT MODAL
  // ===================================================================
  showEditAccountModal = false;
  accountBeingEdited: InventoryItem | null = null;
  editAccountForm: {
    walletAddress: string;
    limitAmount: any;
    fttAcceptance: boolean;
    partialPayinEnabled: boolean;
  } = {
    walletAddress: "",
    limitAmount: null,
    fttAcceptance: true,
    partialPayinEnabled: true,
  };
  originalWalletAddress = "";
  existingQrPreviewUrl: string | null = null;
  newQrData: string = "";
  newQrPreviewUrl: string | null = null;
  newGeneratedQrFile: File | null = null;
  isGeneratingNewQr = false;
  qrUploadError = "";
  isSavingEdit = false;
  private newQrPreviewIsBlobUrl = false;

  @ViewChild("editQrWrapper", { static: false }) editQrWrapper!: ElementRef;

  get walletAddressChanged(): boolean {
    return (
      this.editAccountForm.walletAddress.trim() !==
      this.originalWalletAddress.trim()
    );
  }

  get canSaveEdit(): boolean {
    if (this.walletAddressChanged && !this.newGeneratedQrFile) return false;
    return true;
  }

  get activeFilters(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.statusFilter && this.statusFilter !== "all") count++;
    if (this.maxLimit !== null && this.maxLimit > 0) count++;
    if (this.selectedMode && this.selectedMode !== "all") count++;
    if (this.selectedCurrency?.currency) count++;
    return count;
  }

  // Type dropdown, selected currency ke hisaab se filter hoke aata hai
  get modesForSelectedCurrency(): string[] {
    if (!this.selectedCurrency?.currency) return this.availableModes;
    const set = new Set(
      this.allItems
        .filter((i) => i.currency === this.selectedCurrency.currency)
        .map((i) => i.type),
    );
    return Array.from(set);
  }

  constructor(
    private bankService: BankService,
    private upiService: UpiService,
    private cryptoService: CryptoService,
    private userStateService: UserStateService,
    private snack: SnackbarService,
    private multiMedia: MultimediaService,
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.initAddUpiForm();

    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm = value;
        this.currentPage = 1;
        this.applyClientFilters();
      });

    this.fetchAllPaymentMethods();

    this.countdownInterval = setInterval(() => {
      this.pagedItems = [...this.pagedItems];
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    Object.values(this.qrImageUrls).forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
  }

  // =========================================================
  //  FETCH — single combined API, koi currency/routing API nahi
  // =========================================================
  fetchAllPaymentMethods(): void {
    if (!this.currentRoleId) return;
    this.loading = true;

    const sub = this.bankService
      .getAllPaymentMethods({
        entityId: this.currentRoleId,
        entityType: this.role,
        page: 0,
        size: 200,
      })
      .pipe(
        catchError(() => {
          this.loading = false;
          return of(null);
        }),
      )
      .subscribe((res: any) => {
        this.loading = false;

        if (!res) {
          this.allItems = [];
          this.applyClientFilters();
          return;
        }

        const rows: any[] = Array.isArray(res?.data?.content)
          ? res.data.content
          : Array.isArray(res?.data)
            ? res.data
            : [];

        this.allItems = rows.map((r: any) => this.mapRow(r));

        this.currencies = Array.from(
          new Set(this.allItems.map((i) => i.currency).filter(Boolean)),
        );

        this.availableModes = Array.from(
          new Set(this.allItems.map((i) => i.type).filter(Boolean)),
        );

        this.loadQrThumbnails();
        this.applyClientFilters();
      });

    this.subs.add(sub);
  }

  private mapRow(r: any): InventoryItem {
    const type: ItemType = (r.type || "").toUpperCase();

    let displayAddress = "-";
    if (type === "BANK") {
      displayAddress = r.accountNo || "-";
    } else if (type === "UPI") {
      displayAddress = r.vpa || "-";
    } else {
      displayAddress = r.walletAddress || "-";
    }

    return {
      id: r.id,
      type,
      entityType: r.entityType,
      entityId: r.entityId,
      currency: r.currency || "",
      limitAmount: r.limitAmount ?? "",
      remainingLimitAmount: r.remainingLimitAmount,
      status: !!r.status,
      fttAcceptance: r.fttAcceptance ?? true,
      partialPayinEnabled: r.partialPayinEnabled ?? false,
      liveAssigned: r.liveAssigned ?? false,
      limitTime: r.limitTime ?? null,
      ranges: r.ranges ?? [],
      qrImagePath: r.qrImagePath ?? null,
      qrImageUrl: null,

      accountNo: r.accountNo ?? null,
      accountHolderName: r.accountHolderName ?? null,
      bankCode: r.bankCode ?? null,
      bankName: r.bankName ?? null,
      accountType: r.accountType ?? null,
      bankTime: r.bankTime ?? null,
      upiCount: r.upiCount ?? null,

      vpa: r.vpa ?? null,
      upiTime: r.upiTime ?? null,
      accountHolder: r.accountHolder ?? null,

      walletAddress: r.walletAddress ?? null,
      cryptoTime: r.cryptoTime ?? null,
      holderName: r.holderName ?? null,

      displayAddress,
    };
  }

  private loadQrThumbnails(): void {
    this.allItems.forEach((item) => {
      if (!item.qrImagePath) return;
      if (this.qrImageUrls[item.id]) return;

      this.qrImageLoading[item.id] = true;
      const sub = this.multiMedia
        .getPrivateImage(item.qrImagePath)
        .pipe(catchError(() => of(null)))
        .subscribe((url) => {
          this.qrImageLoading[item.id] = false;
          if (url) {
            this.qrImageUrls[item.id] = url;
            item.qrImageUrl = url;
          }
        });
      this.subs.add(sub);
    });
  }

  openQrPreview(item: InventoryItem): void {
    if (!item.qrImagePath) {
      this.snack.show("No QR available for this account", false);
      return;
    }
    this.selectedQrItem = item;
    this.showQrPreviewModal = true;
  }

  closeQrPreview(): void {
    this.showQrPreviewModal = false;
    this.selectedQrItem = null;
  }

  // =========================================================
  //  CURRENCY / MODE — pure client side, koi routing nahi
  //  Currency change hote hi Type list us currency ke items
  //  se hi (INR -> BANK/UPI, USDT -> TRC20/ERC20/...) niklegi
  // =========================================================
  onCurrencyChange(value: string) {
    this.selectedCurrency = value ? { currency: value } : null;

    // agar current selected type naye currency me available nahi hai to reset karo
    if (
      this.selectedMode !== "all" &&
      !this.modesForSelectedCurrency.includes(this.selectedMode)
    ) {
      this.selectedMode = "all";
    }

    this.currentPage = 1;
    this.applyClientFilters();
  }

  onModeChange(_event?: Event) {
    this.currentPage = 1;
    this.applyClientFilters();
  }

  isCurrencyInList(): boolean {
    if (!this.selectedCurrency) return false;
    return this.currencies.includes(this.selectedCurrency.currency);
  }

  // =========================================================
  //  FILTERS — sab kuch client side
  // =========================================================
  onSearchInput(value: string) {
    this.searchSubject.next(value);
  }

  applyFilters(): void {
    this.searchTerm = this.draftSearchTerm;
    this.maxLimit = this.draftMaxLimit;
    this.statusFilter = this.draftStatusFilter;
    this.currentPage = 1;
    this.applyClientFilters();
  }

  resetFilters(): void {
    this.searchTerm = "";
    this.draftSearchTerm = "";
    this.maxLimit = null;
    this.draftMaxLimit = null;
    this.statusFilter = "all";
    this.draftStatusFilter = "all";
    this.selectedCurrency = null;
    this.selectedMode = "all";
    this.currentPage = 1;
    this.applyClientFilters();
  }

  clearLimitFilter(): void {
    this.maxLimit = null;
    this.draftMaxLimit = null;
    this.currentPage = 1;
    this.applyClientFilters();
  }

  clearSearchFilter(): void {
    this.searchTerm = "";
    this.draftSearchTerm = "";
    this.currentPage = 1;
    this.applyClientFilters();
  }

  applyClientFilters(): void {
    let items = [...this.allItems];

    if (this.selectedMode && this.selectedMode !== "all") {
      items = items.filter(
        (i) => i.type.toLowerCase() === this.selectedMode.toLowerCase(),
      );
    }

    if (this.selectedCurrency?.currency) {
      items = items.filter(
        (i) => i.currency === this.selectedCurrency.currency,
      );
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      items = items.filter((i) => {
        return (
          (i.displayAddress || "").toLowerCase().includes(term) ||
          (i.accountHolderName || "").toLowerCase().includes(term) ||
          (i.bankName || "").toLowerCase().includes(term) ||
          (i.bankCode || "").toLowerCase().includes(term) ||
          (i.vpa || "").toLowerCase().includes(term) ||
          (i.walletAddress || "").toLowerCase().includes(term)
        );
      });
    }

    if (this.statusFilter === "active") {
      items = items.filter((i) => i.status);
    } else if (this.statusFilter === "inactive") {
      items = items.filter((i) => !i.status);
    }

    if (this.maxLimit && this.maxLimit > 0) {
      items = items.filter((i) => Number(i.limitAmount || 0) <= this.maxLimit!);
    }

    items.sort((a, b) => {
      const aTime = a.limitTime ? new Date(a.limitTime).getTime() : 0;
      const bTime = b.limitTime ? new Date(b.limitTime).getTime() : 0;
      return bTime - aTime;
    });

    this.filteredItems = items;
    this.totalElements = items.length;
    this.totalPagesCount = Math.max(1, Math.ceil(items.length / this.pageSize));

    if (this.currentPage > this.totalPagesCount) {
      this.currentPage = 1;
    }

    this.updatePageNumbers();
    this.paginate();
  }

  private paginate(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedItems = this.filteredItems.slice(start, start + this.pageSize);
  }

  // =========================================================
  //  PAGINATION
  // =========================================================
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
      this.updatePageNumbers();
      this.paginate();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
      this.updatePageNumbers();
      this.paginate();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePageNumbers();
      this.paginate();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.totalPagesCount = Math.max(
      1,
      Math.ceil(this.filteredItems.length / this.pageSize),
    );
    this.updatePageNumbers();
    this.paginate();
  }

  // =========================================================
  //  ACTIVE / LIVE LOGIC — bank/upi/crypto ka same logic, unified
  // =========================================================
  isAccountActive(item: InventoryItem): boolean {
    const now = Date.now();
    const limitTime = item.limitTime
      ? new Date(item.limitTime).getTime()
      : null;

    let secondaryTime: number | null = null;
    if (item.type === "BANK") {
      secondaryTime = item.bankTime ? new Date(item.bankTime).getTime() : null;
    } else if (item.type === "UPI") {
      secondaryTime = item.upiTime ? new Date(item.upiTime).getTime() : null;
    } else {
      secondaryTime = item.cryptoTime
        ? new Date(item.cryptoTime).getTime()
        : null;
    }

    const status = item.status
      ? true
      : secondaryTime != null
        ? secondaryTime > now
        : false;

    return !!(limitTime !== null && limitTime > now && status);
  }

  getRemainingTime(item: InventoryItem): string {
    const timeField =
      item.type === "BANK"
        ? item.bankTime
        : item.type === "UPI"
          ? item.upiTime
          : item.cryptoTime;

    if (!timeField) return "";
    const diff = new Date(timeField).getTime() - Date.now();
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

  maskAddress(address: string | null | undefined, type: string): string {
    if (!address || address === "-") return "-";
    if (type === "BANK") {
      if (address.length <= 4) return address;
      return "*".repeat(address.length - 4) + address.slice(-4);
    }
    if (type === "UPI") return address;
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  copyText(value: string | null | undefined, message: string): void {
    if (!value) return;
    navigator.clipboard.writeText(value);
    this.snack.show(message, true);
  }

  toggleActionDropdown(id: string, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.activeActionDropdown = this.activeActionDropdown === id ? null : id;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest(".action-dropdown-wrapper")) {
      this.activeActionDropdown = null;
    }
    if (
      this.selectedCapacityAccount &&
      !target.closest(".capacity-popup-wrapper")
    ) {
      this.closeCapacityPopup();
    }
  }

  // =========================================================
  //  EDIT DISPATCHER — item.type ke hisaab se sahi modal khulega
  // =========================================================
  openEditModal(item: InventoryItem): void {
    if (item.type === "BANK") {
      this.openBankDetails(item);
    } else if (item.type === "UPI") {
      this.openUpdateModal(item);
    } else {
      this.openEditAccountModal(item);
    }
  }

  // =========================================================
  //  STATUS TOGGLE / DELETE — item.type ke hisaab se sahi service
  // =========================================================
  openStatusModal(item: InventoryItem, event: any): void {
    event.preventDefault();
    this.selectedItem = item;
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
    this.selectedItem = null;
    this.toggleEvent = null;
  }

  confirmStatusChange(): void {
    if (!this.selectedItem) return;
    if (!this.confirmStatusChecked) {
      this.snack.show(
        "Please confirm by checking the checkbox before proceeding",
        false,
      );
      return;
    }

    const item = this.selectedItem;

    if (item.type === "BANK") {
      this.bankService.toggleIsBank(item.id).subscribe({
        next: (res: any) => {
          this.snack.show(res?.message || "Status updated", true);
          this.showStatusModal = false;
          this.fetchAllPaymentMethods();
        },
        error: (err) => {
          this.snack.show(
            err.error?.message || "Failed to update status",
            false,
          );
          this.closeStatusModal();
        },
      });
    } else if (item.type === "UPI") {
      this.upiService.toggleIsUpi(item.id).subscribe({
        next: () => {
          this.snack.show("Status updated", true);
          this.showStatusModal = false;
          this.fetchAllPaymentMethods();
        },
        error: (err: any) => {
          this.snack.show(
            err?.error?.message || "Failed to update status",
            false,
          );
          this.closeStatusModal();
        },
      });
    } else {
      this.cryptoService.toggleCryptoStatus(item.id, item.type).subscribe({
        next: (res: any) => {
          this.snack.show(res?.message || "Status updated", true);
          this.showStatusModal = false;
          this.fetchAllPaymentMethods();
        },
        error: (err: any) => {
          this.snack.show(
            err?.error?.message || "Failed to update status",
            false,
          );
          this.closeStatusModal();
        },
      });
    }
  }

  openDeleteConfirm(item: InventoryItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.deleteCandidate = item;
    this.isDeleteConfirmVisible = true;
  }

  closeDeleteConfirm(): void {
    this.deleteCandidate = null;
    this.isDeleteConfirmVisible = false;
  }

  executeDelete(): void {
    if (!this.deleteCandidate) return;
    const item = this.deleteCandidate;

    if (item.type === "BANK") {
      this.bankService.toogleBankDeleted(item.id).subscribe({
        next: (res: any) => {
          this.snack.show(res?.message || "Bank deleted", true);
          this.closeDeleteConfirm();
          this.fetchAllPaymentMethods();
        },
        error: (err) => {
          this.snack.show(
            err.error?.message || "Failed to delete the bank",
            false,
          );
          this.closeDeleteConfirm();
        },
      });
    } else if (item.type === "UPI") {
      this.upiService.toogleUpiDeleted(item.id).subscribe({
        next: (res: any) => {
          this.snack.show(res?.message || "UPI deleted", true);
          this.closeDeleteConfirm();
          this.fetchAllPaymentMethods();
        },
        error: (err) => {
          this.snack.show(err.error?.message || "Failed to delete UPI", false);
          this.closeDeleteConfirm();
        },
      });
    } else {
      this.cryptoService.deleteCrypto(item.id, {}).subscribe({
        next: (res: any) => {
          this.snack.show(res?.message || "Crypto account deleted", true);
          this.closeDeleteConfirm();
          this.fetchAllPaymentMethods();
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
  }

  // ---------- LIMIT TIME MODAL ----------
  openLimitModal(item: InventoryItem) {
    this.editingItem = item;
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

    if (!this.editingItem) return;

    const selectedTime = selected.getTime();
    const nowTime = Date.now();

    if (selectedTime < nowTime) {
      this.snack.show("Please select a future date and time", false);
      return;
    }

    this.isSubmittingLimit = true;
    const id = this.editingItem.id;
    const type = this.editingItem.type;

    const isoLocal = new Date(
      selected.getTime() - selected.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);

    if (type === "BANK") {
      this.bankService.setLimitTime(id, { dateTime: isoLocal }).subscribe({
        next: () => this.onLimitTimeSuccess(),
        error: (err) => this.onLimitTimeError(err),
      });
    } else if (type === "UPI") {
      this.upiService.setLimitTime(id, { dateTime: isoLocal }).subscribe({
        next: () => this.onLimitTimeSuccess(),
        error: (err) => this.onLimitTimeError(err),
      });
    } else {
      this.cryptoService.setLimitTime(id, { dateTime: selected }).subscribe({
        next: () => this.onLimitTimeSuccess(),
        error: (err) => this.onLimitTimeError(err),
      });
    }
  }

  private onLimitTimeSuccess() {
    this.snack.show("Limit time set successfully", true);
    this.closeLimitModal();
    this.isSubmittingLimit = false;
    this.fetchAllPaymentMethods();
  }

  private onLimitTimeError(err: any) {
    this.snack.show(err?.error?.message || "Failed to set limit time", false);
    this.isSubmittingLimit = false;
  }

  closeLimitModal() {
    this.showLimitModal = false;
    this.minLimitDateTime = "";
    this.editingItem = null;
  }

  // ---------- CAPACITY POPUP / MODAL ----------
  openCapacityPreview(item: InventoryItem, event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.selectedCapacityAccount = item;

    const popupWidth = 280;
    const rows = item?.ranges?.length || 0;
    const popupHeight = Math.max(120, rows * 56 + 70);

    let left = rect.left + rect.width / 2 - popupWidth / 2;
    let top = rect.bottom + 8;

    if (top + popupHeight > window.innerHeight)
      top = rect.top - popupHeight - 8;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    if (left + popupWidth > window.innerWidth - 10)
      left = window.innerWidth - popupWidth - 10;

    this.capacityPopupTop = top;
    this.capacityPopupLeft = left;
  }

  closeCapacityPopup() {
    this.selectedCapacityAccount = null;
  }

  openCapacity(item: InventoryItem) {
    this.selectedId = item.id;
    this.selectedPortalId = item.id;
    this.selectedPayinId = item.id;
    this.capacityMode =
      item.type === "BANK" ? "BANK" : item.type === "UPI" ? "UPI" : item.type;
    this.showCapacityModal = true;
    this.closeCapacityPopup();
  }

  openAddInventoryModal() {
    this.showInventoryModal = true;
  }

  closeInventoryModal() {
    this.showInventoryModal = false;
  }

  // ===================================================================
  //  BANK — VIEW / EDIT DETAILS MODAL
  // ===================================================================
  openBankDetails(item: InventoryItem): void {
    this.selectedBankAccount = item;
    this.showBankDetailsModal = true;
  }

  closeBankDetails(): void {
    this.showBankDetailsModal = false;
    this.selectedBankAccount = null;
  }

  refreshBankAccounts = () => {
    this.fetchAllPaymentMethods();
  };

  // ===================================================================
  //  BANK ROW ONLY — "Add UPI" / "View UPI"
  // ===================================================================
  viewUpi(item: InventoryItem) {
    const bankId = item?.id;
    if (!bankId) return;

    if (this.role === "HEAD") {
      this.router.navigate(["/head/upi"], {
        queryParams: { bankId, mode: "upi", paymentMethod: null },
        queryParamsHandling: "merge",
      });
    } else if (this.role === "BRANCH") {
      this.router.navigate(["/branch/upi"], {
        queryParams: { bankId, mode: "upi", paymentMethod: null },
        queryParamsHandling: "merge",
      });
    }
  }

  initAddUpiForm() {
    this.addUpiForm = this.fb.group({
      vpa: [
        "",
        [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/),
        ],
      ],
      bankId: [""],
      limitAmount: ["", [Validators.required, Validators.min(1)]],
    });
  }

  openAddUpiFromBank(item: InventoryItem) {
    this.selectedBank = item;
    this.showAddUpiModal = true;
    document.body.style.overflow = "hidden";
  }

  closeAddUpiModal() {
    this.showAddUpiModal = false;
    this.addUpiForm.reset();
    this.generatedFile = null;
    this.manualQrFile = null;
    this.selectedBank = null;
    this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];
    document.body.style.overflow = "auto";
  }

  submitAddUpi(): void {
    Object.keys(this.addUpiForm.controls).forEach((key) =>
      this.addUpiForm.get(key)?.markAsTouched(),
    );

    if (this.addUpiForm.invalid) {
      this.snack.show("Please fill all required fields correctly.", false);
      return;
    }

    if (!this.generatedFile && !this.manualQrFile) {
      this.snack.show("Please upload or generate QR code.", false);
      return;
    }

    if (!this.selectedBank) {
      this.snack.show("Bank not selected.", false);
      return;
    }

    const validRanges = this.capacityRanges
      .filter(
        (r) =>
          r.minRange != null &&
          r.maxRange != null &&
          r.quantity != null &&
          r.minRange > 0 &&
          r.maxRange > 0 &&
          r.quantity > 0,
      )
      .map((r) => ({
        minRange: r.minRange!,
        maxRange: r.maxRange!,
        quantity: r.quantity!,
      }));

    const payload = {
      vpa: this.addUpiForm.value.vpa,
      limitAmount: this.addUpiForm.value.limitAmount,
      entityId: this.currentRoleId,
      entityType: this.role,
      userId: this.currentUserId,
      active: true,
      bankId: this.selectedBank?.id,
      ranges: validRanges.length ? validRanges : null,
      createdAt: new Date().toISOString(),
    };

    const formData = new FormData();
    formData.append(
      "dto",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );

    const fileToSend = this.generatedFile || this.manualQrFile;
    if (fileToSend) {
      formData.append("file", fileToSend, fileToSend.name);
    }

    if (this.currentUserId) {
      formData.append("userId", this.currentUserId);
    }

    this.isAddingUpi = true;

    this.upiService.add(formData).subscribe({
      next: (res: any) => {
        this.isAddingUpi = false;

        if (res?.success || res?.id || res?._id) {
          this.snack.show(res?.message || "UPI added successfully!", true);
          this.closeAddUpiModal();
          this.fetchAllPaymentMethods();
        } else {
          this.snack.show(res?.message || "Failed to add UPI.", false);
        }
      },
      error: (err: any) => {
        this.isAddingUpi = false;
        this.snack.show(
          err?.error?.message || err?.error?.error || "Failed to add UPI",
          false,
        );
      },
    });
  }

  generateQrFromVpa(): void {
    const vpaControl = this.addUpiForm.get("vpa");
    if (!vpaControl || vpaControl.invalid) {
      vpaControl?.markAsTouched();
      return;
    }

    const vpa = String(vpaControl.value).trim();
    const upiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;

    this.qrData = upiIntent;

    setTimeout(() => this.captureQrImage(), 300);
  }

  private captureQrImage(): void {
    try {
      const qrcodeElement = this.qrcodeElem;
      if (!qrcodeElement?.nativeElement) return;

      setTimeout(() => {
        const canvas = qrcodeElement.nativeElement.querySelector("canvas");
        if (!canvas) return;

        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) {
              const filename = `upi_qr_${Date.now()}.png`;
              this.generatedFile = new File([blob], filename, {
                type: "image/png",
              });
            }
          },
          "image/png",
          1.0,
        );
      }, 100);
    } catch {}
  }

  onQrFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.manualQrFile = file;
    this.generatedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  setQrMode(mode: "generate" | "upload") {
    this.qrMode = mode;
    this.qrData = null;
    this.generatedFile = null;
    this.manualQrFile = null;
    this.selectedImage = null;
  }

  removeQr() {
    this.qrData = null;
    this.generatedFile = null;
    this.manualQrFile = null;
    this.selectedImage = null;
  }

  // downloadQr(): void {
  //   if (!this.generatedFile) return;
  //   const url = URL.createObjectURL(this.generatedFile);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = this.generatedFile.name;
  //   document.body.appendChild(a);
  //   a.click();
  //   document.body.removeChild(a);
  //   URL.revokeObjectURL(url);
  // }

  updateFrom(index: number, event: any) {
    const value = event.target.value;
    this.capacityRanges[index].minRange =
      value === "" || value === null ? null : Number(value);
  }

  updateTo(index: number, event: any) {
    const value = event.target.value;
    this.capacityRanges[index].maxRange =
      value === "" || value === null ? null : Number(value);
  }

  updateQuantity(index: number, event: any) {
    const value = event.target.value;
    this.capacityRanges[index].quantity =
      value === "" || value === null ? null : Number(value);
  }

  addRange() {
    const last = this.capacityRanges[this.capacityRanges.length - 1];

    if (
      last.minRange == null ||
      last.maxRange == null ||
      last.quantity == null
    ) {
      this.snack.show("Please fill all range fields first.", false);
      return;
    }
    if (last.minRange <= 0 || last.maxRange <= 0 || last.quantity <= 0) {
      this.snack.show("Range values must be greater than 0.", false);
      return;
    }
    if (last.maxRange <= last.minRange) {
      this.snack.show("'To' must be greater than 'From'.", false);
      return;
    }

    this.capacityRanges.push({
      minRange: null,
      maxRange: null,
      quantity: null,
    });
  }

  removeRange(index: number) {
    this.capacityRanges.splice(index, 1);
    if (this.capacityRanges.length === 0) {
      this.capacityRanges = [
        { minRange: null, maxRange: null, quantity: null },
      ];
    }
  }

  // ===================================================================
  //  UPI — EDIT / UPDATE MODAL
  // ===================================================================
  openUpdateModal(item: InventoryItem): void {
    this.editingUpi = item;
    this.updateForm = {
      vpa: item.vpa || "",
      limitAmount: item.limitAmount || "",
      fttAcceptance: item.fttAcceptance ?? true,
      partialPayinEnabled: item.partialPayinEnabled ?? true,
    };
    this.originalVpa = (item.vpa || "").trim().toLowerCase();
    this.vpaChanged = false;
    this.newQrGenerated = false;
    this.updateQrData = null;
    this.generatedUpdateFile = null;
    this.updateQrError = "";
    this.showUpdateModal = true;
    document.body.style.overflow = "hidden";
  }

  closeUpdateModal(): void {
    this.showUpdateModal = false;
    this.editingUpi = null;
    this.updateForm = {
      vpa: "",
      limitAmount: "",
      fttAcceptance: true,
      partialPayinEnabled: true,
    };
    this.originalVpa = "";
    this.updateQrData = null;
    this.generatedUpdateFile = null;
    this.isSubmitting = false;
    this.isGeneratingUpdateQr = false;
    this.updateQrError = "";
    this.vpaChanged = false;
    this.newQrGenerated = false;
    this.updateManualQrFile = null;
    this.updateSelectedImage = null;
    this.updateQrMode = "generate";
    document.body.style.overflow = "auto";
  }

  onUpdateVpaChange(): void {
    const currentVpa = (this.updateForm.vpa || "").trim().toLowerCase();
    this.vpaChanged = currentVpa !== this.originalVpa;
    if (this.vpaChanged) {
      this.newQrGenerated = false;
      this.updateQrData = null;
      this.generatedUpdateFile = null;
    }
    if (this.isValidUpiId(currentVpa)) {
      this.updateQrError = "";
    }
  }

  isValidUpiId(vpa: string): boolean {
    return this.vpaPattern.test(vpa);
  }

  generateQrForUpdate(): void {
    const vpa = String(this.updateForm.vpa).trim();
    if (!this.isValidUpiId(vpa)) {
      this.updateQrError = "Please enter a valid UPI ID first";
      return;
    }
    this.updateQrError = "";
    const upiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;
    this.updateQrData = upiIntent;
    this.isGeneratingUpdateQr = true;
    setTimeout(() => this.captureUpdateQrImage(), 600);
  }

  private captureUpdateQrImage(): void {
    try {
      const qrcodeElement = this.updateQrcodeElem;
      if (!qrcodeElement?.nativeElement) {
        this.isGeneratingUpdateQr = false;
        return;
      }
      setTimeout(() => {
        const canvas = qrcodeElement.nativeElement.querySelector("canvas");
        if (!canvas) {
          this.isGeneratingUpdateQr = false;
          return;
        }
        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) {
              const filename = `upi_qr_update_${Date.now()}.png`;
              this.generatedUpdateFile = new File([blob], filename, {
                type: "image/png",
              });
              this.newQrGenerated = true;
            }
            this.isGeneratingUpdateQr = false;
          },
          "image/png",
          1.0,
        );
      }, 100);
    } catch {
      this.isGeneratingUpdateQr = false;
    }
  }

  onUpdateQrFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    const maxSize = 500 * 1024;
    if (file.size > maxSize) {
      this.snack.show("Image size should be less than 500KB", false);
      return;
    }
    this.updateManualQrFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.updateSelectedImage = reader.result as string;
    };
    reader.readAsDataURL(file);
    this.generatedUpdateFile = file;
    this.newQrGenerated = true;
  }

  setUpdateQrMode(mode: "generate" | "upload") {
    this.updateQrMode = mode;
    this.updateQrData = null;
    this.generatedUpdateFile = null;
    this.updateManualQrFile = null;
    this.updateSelectedImage = null;
    this.newQrGenerated = false;
  }

  removeUpdateQr() {
    this.updateQrData = null;
    this.updateSelectedImage = null;
    this.updateManualQrFile = null;
    this.generatedUpdateFile = null;
  }

  submitUpdate(): void {
    if (!this.editingUpi) return;

    const vpa = (this.updateForm.vpa || "").trim();
    const limit = parseFloat(this.updateForm.limitAmount) || 0;

    if (!vpa || !this.isValidUpiId(vpa)) {
      this.snack.show("Valid UPI ID required", false);
      return;
    }
    if (limit <= 0) {
      this.snack.show("Valid limit required", false);
      return;
    }

    const qrFile = this.generatedUpdateFile || this.updateManualQrFile;

    const dtoPayload: any = {
      id: this.editingUpi.id,
      entityId: this.editingUpi.entityId || this.currentRoleId,
      entityType: this.editingUpi.entityType || this.role,
      vpa,
      limitAmount: limit.toString(),
      active: true,
      fttAcceptance: this.updateForm.fttAcceptance,
      partialPayinEnabled: this.updateForm.partialPayinEnabled,
    };

    const formData = new FormData();
    formData.append(
      "dto",
      new Blob([JSON.stringify(dtoPayload)], { type: "application/json" }),
    );

    if (qrFile) {
      formData.append("file", qrFile, qrFile.name);
    }

    this.isSubmitting = true;

    this.upiService.updateUpi(formData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.fetchAllPaymentMethods();
        this.snack.show(res?.message || "UPI updated successfully!", true);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.snack.show(err?.error?.message || "Error updating UPI", false);
      },
    });
  }

  // ===================================================================
  //  CRYPTO — EDIT ACCOUNT MODAL
  // ===================================================================
  openEditAccountModal(item: InventoryItem): void {
    this.accountBeingEdited = item;
    this.originalWalletAddress = item.walletAddress || "";
    this.editAccountForm = {
      walletAddress: item.walletAddress || "",
      limitAmount: item.limitAmount,
      fttAcceptance: item.fttAcceptance,
      partialPayinEnabled: item.partialPayinEnabled,
    };

    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();
    this.newQrPreviewUrl = null;
    this.newGeneratedQrFile = null;
    this.isGeneratingNewQr = false;
    this.qrUploadError = "";

    this.existingQrPreviewUrl = null;
    if (item.qrImagePath) {
      if (this.qrImageUrls[item.id]) {
        this.existingQrPreviewUrl = this.qrImageUrls[item.id];
      } else {
        const sub = this.multiMedia
          .getPrivateImage(item.qrImagePath)
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
    this.editAccountForm = {
      walletAddress: "",
      limitAmount: null,
      fttAcceptance: true,
      partialPayinEnabled: true,
    };
    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();
    this.newQrPreviewUrl = null;
    this.newGeneratedQrFile = null;
    this.qrUploadError = "";
  }

  onEditWalletAddressChange(): void {
    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();
    this.newQrPreviewUrl = null;
    this.newGeneratedQrFile = null;
    this.qrUploadError = "";
  }

  private revokeNewQrPreviewIfBlob(): void {
    if (this.newQrPreviewIsBlobUrl && this.newQrPreviewUrl) {
      try {
        URL.revokeObjectURL(this.newQrPreviewUrl);
      } catch {}
    }
    this.newQrPreviewIsBlobUrl = false;
  }

  discardNewQr(): void {
    this.newQrData = "";
    this.revokeNewQrPreviewIfBlob();
    this.newQrPreviewUrl = null;
    this.newGeneratedQrFile = null;
    this.qrUploadError = "";
  }

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

    const filename = `qr_${this.accountBeingEdited?.type}_${Date.now()}.png`;

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
      this.newQrPreviewIsBlobUrl = false;

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

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.qrUploadError = "File must be smaller than 5MB.";
      input.value = "";
      return;
    }

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
      entityId: this.accountBeingEdited.entityId || this.currentRoleId,
      entityType: this.accountBeingEdited.entityType || this.role,
      walletAddress: this.editAccountForm.walletAddress.trim(),
      limitAmount: this.editAccountForm.limitAmount,
      fttAcceptance: this.editAccountForm.fttAcceptance,
      partialPayinEnabled: this.editAccountForm.partialPayinEnabled,
    };

    const formData = new FormData();
    formData.append(
      "dto",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );

    if (this.newGeneratedQrFile) {
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

    this.cryptoService
      .updateCrypto(this.accountBeingEdited.id, formData)
      .subscribe({
        next: (res: any) => {
          this.snack.show(res?.message || "Account updated successfully", true);
          this.isSavingEdit = false;
          this.closeEditAccountModal();
          this.fetchAllPaymentMethods();
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
  downloadQr(): void {
    if (!this.selectedQrItem) return;

    const imageUrl = this.qrImageUrls[this.selectedQrItem.id];
    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${this.selectedQrItem.type || "QR"}-${this.selectedQrItem.id}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  showLimitTooltip(item: InventoryItem, event: MouseEvent): void {
    clearTimeout(this.hoverTimeout);

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipWidth = 288;

    this.tooltipPosition = {
      x: rect.left + rect.width / 2 - tooltipWidth / 2,
      y: rect.bottom + 8,
    };

    this.hoveredLimitAccount = item;
  }

  hideLimitTooltip(): void {
    this.hoverTimeout = setTimeout(() => {
      this.hoveredLimitAccount = null;
    }, 150);
  }

  clearHide(): void {
    clearTimeout(this.hoverTimeout);
  }

  openLimitDetails(item: InventoryItem): void {
    this.selectedLimitAccount = item;
    this.selectedCapacityAccount = null;
  }

  closeLimitDetails(): void {
    this.selectedLimitAccount = null;
  }
  toggleView(mode: "table" | "grid"): void {
    this.viewMode = mode;
  }
}
