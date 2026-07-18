import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { of, Subscription } from "rxjs";
import { catchError } from "rxjs/operators";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { UpiService } from "../../../pages/services/upi.service";
import { BranchService } from "../../../pages/services/branch.service";
import { UserStateService } from "../../../store/user-state.service";
import { UserService } from "../../../pages/services/user.service";
import { HeadService } from "../../../pages/services/head.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { MultimediaService } from "../../../pages/services/multimedia.service";
import { BankService } from "../../../pages/services/bank.service";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";

@Component({
  selector: "app-upis",
  templateUrl: "./upis.component.html",
  styleUrl: "./upis.component.css",
})
export class UpisComponent implements OnInit {
  // ---------- DATA ----------
  upis: any[] = [];
  portals: any[] = [];
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipData: any = null;

  // ---------- FILTERS ----------
  searchTerm = "";
  private searchSubject = new Subject<string>();
  filterStatus = "";
  selectedPortal: any = null;
  maxLimit: number | null = null;
  transactionMinAmount: number | null = null;
  transactionMaxAmount: number | null = null;
  showPaymentDropdown = false;
  selectedMethod = "bank";
  selectedLimitUpi: any = null;
  hoveredLimitUpi: any = null;
  limitTooltipPosition = { x: 0, y: 0 };
  private limitHoverTimeout: any;

  showTxnModal = false;
  selectedTxnData: any = null;
  private countdownInterval: any;

  // ---------- TOGGLE CONFIRM ----------
  isToggleConfirmVisible = false;
  toggleCandidateUpi: any = null;

  selectedCurrencyData: any = null;
  selectedModeData: string = "";
  private currencySub!: Subscription;
  private modeSub!: Subscription;

  // ---------- UI FILTER STATE ----------
  portalSearchTerm = "";
  showPortalDropdown = false;
  filteredPortals: any[] = [];
  showAmountFilter = false;
  pageNumbers: number[] = [];

  get limitFilterActive(): boolean {
    return this.maxLimit !== null && this.maxLimit > 0;
  }
  get transactionFilterActive(): boolean {
    return !!(this.transactionMinAmount || this.transactionMaxAmount);
  }

  payinStatus: any = false;

  // ---------- IMAGE / QR ----------
  selectedImage: string | null = null;
  qrMode: "generate" | "upload" = "generate";
  vpaChanged: boolean = false;
  newQrGenerated: boolean = false;

  // ---------- ADD MODAL ----------
  generatingQr = false;
  qrData: string | null = null;
  generatedFile: File | null = null;
  upiPortalSearch = "";
  upiFilteredPortals: any[] = [];
  selectedUpiPortal: any = null;

  // ---------- UPDATE MODAL ----------
  showUpdateModal = false;
  editingUpi: any = null;
  updateForm: any = {
    vpa: "",
    limitAmount: "",
    status: "active",
    fttAcceptance: true,
  };
  updateManualQrFile: File | null = null;
  updateSelectedImage: string | null = null;
  isSubmitting = false;
  isGeneratingUpdateQr = false;
  updateQrData: string | null = null;
  generatedUpdateFile: File | null = null;
  updateQrMode: "generate" | "upload" = "generate";
  originalVpa = "";
  updateQrError = "";
  showInventoryModal = false;
  //CAPACITY
  capacityPopupTop = 0;
  capacityPopupLeft = 0;
  selectedCapacityAccount: any = null;

  // ---------- USER / ROLE ----------
  currentRoleId: any;
  currentUserId: any;
  role: any;
  userId: any;

  showLimitModal: boolean = false;
  limitDateTime: any;
  isSubmittingLimit: boolean = false;
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
  minLimitDateTime: string = "";

  // ---------- PAGINATION ----------
  currentPage = 1;
  pageSize = 6;
  totalElements = 0;
  totalPagesCount = 0;
  Math = Math;

  // ---------- QR VIEWCHILD ----------
  @ViewChild("qrcodeElem", { static: false, read: ElementRef })
  qrcodeElem!: ElementRef;
  @ViewChild("updateQrcodeElem", { static: false, read: ElementRef })
  updateQrcodeElem!: ElementRef;

  private vpaPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  // ---------- DROPDOWN ----------
  activeDropdownUpiId: string | null = null;
  viewMode: "table" | "grid" = "table";
  showUpiPortalDropdown = false;

  get activeFilters(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.filterStatus) count++;
    if (this.selectedPortal) count++;
    if (this.limitFilterActive) count++;
    if (this.transactionFilterActive) count++;
    return count;
  }

  showCapacityModal = false;
  capacityRanges: any[] = [];
  banks: any[] = [];
  filteredBanks: any[] = [];
  selectedBank: any = null;
  bankSearchTerm = "";
  showBankDropdown = false;
  selectedUpiForCapacity: any = null;
  preselectedBankId: string | null = null;

  constructor(
    private upiService: UpiService,
    private branchService: BranchService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private userStateService: UserStateService,
    private userService: UserService,
    private headService: HeadService,
    private snack: SnackbarService,
    private router: Router,
    private multimediaService: MultimediaService,
    private bankServices: BankService,
    private currencyBehaviourService: CurrencyBehaviourService,
  ) {}

  ngOnInit() {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.currencySub = this.currencyBehaviourService
      .getCurrency()
      .subscribe((res) => {
        if (!res) return;
        this.selectedCurrencyData = res;
        this.fetchUpis();
      });

    this.modeSub = this.currencyBehaviourService.getMode().subscribe((res) => {
      if (!res) return;
      this.selectedModeData = res;
    });
    this.route.queryParams.subscribe((params) => {
      this.preselectedBankId = params["bankId"] || null;
    });

    this.getPayinStatus();
    this.updatePageNumbers();

    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(max-width: 800px)").matches
    ) {
      this.viewMode = "grid";
    }

    this.loadBanks();

    this.searchSubject
      .pipe(debounceTime(600), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm = value;
        this.onSearch();
      });

    this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];
    this.countdownInterval = setInterval(() => {
      this.upis = [...this.upis];
    }, 1000);
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.currencySub) this.currencySub.unsubscribe();
    if (this.modeSub) this.modeSub.unsubscribe();
  }

  openUpiPortalDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showUpiPortalDropdown = !this.showUpiPortalDropdown;
    if (this.showUpiPortalDropdown) {
      this.onUpiPortalSearch();
    }
  }

  // =============================================
  //  FETCH UPIS — COMPLETE FIX
  // =============================================
  fetchUpis(): void {
    if (!this.currentRoleId) return;

    const options: any = {
      page: this.currentPage - 1,
      size: this.pageSize,
      query: this.searchTerm.trim() || undefined,
      minAmount: this.transactionMinAmount ?? undefined,
      maxAmount: this.transactionMaxAmount ?? undefined,
      limit: this.maxLimit ?? undefined,
      bankId: this.selectedPortal?.bankId || undefined,
    };

    if (this.preselectedBankId) {
      options.bankId = this.preselectedBankId;
    }
    if (this.selectedBank?.id) {
      options.bankId = this.selectedBank.id;
    }
    if (this.filterStatus && this.filterStatus.trim() !== "") {
      options.status = this.filterStatus;
    }

    this.upiService
      .getByEntityIdAndActivePaginated(this.currentRoleId, options)
      .subscribe({
        next: (res: any) => {
          const responseData = res.data || res;
          const rows = Array.isArray(responseData.content)
            ? responseData.content
            : Array.isArray(responseData)
              ? responseData
              : [];

          //  STEP 1: MAP — normalizedStatus se isUpiActive bhi set karo
          this.upis = rows.map((r: any) => {
            let parsedRanges: any[] = [];
            if (Array.isArray(r.ranges)) {
              parsedRanges = r.ranges;
            } else if (typeof r.range === "string") {
              parsedRanges = r.range.split(",").map((x: string) => {
                const [from, to] = x.split("-");
                return { from: Number(from), to: Number(to) };
              });
            } else if (typeof r.upiRange === "string") {
              parsedRanges = r.upiRange.split(",").map((x: string) => {
                const [from, to] = x.split("-");
                return { from: Number(from), to: Number(to) };
              });
            }
            this.totalPagesCount = r.totalPages;
            this.updatePageNumbers();

            const rawImagePath = r.qrImagePath || r.qrImageUrl || null;

            //  KEY FIX: normalizedStatus pehle calculate karo
            const normalizedStatus = this.normalizeStatus(r);

            return {
              ...r,
              status: r.status, //  'active' / 'inactive' string
              isUpiActive: normalizedStatus === "active", //  status se sync — r.upi nahi
              liveAssigned: r.liveAssigned ?? false,
              portalDomain:
                r.portalDomain || r.portalName || r.portal || r.bankId || "",
              ranges: r.ranges ?? [],
              qrId: r.qrId || r.qr_id || r.id || "",
              imagePath: rawImagePath,
              qrImageUrl: null,
              limitAmount: r.limitAmount,
              currency: r.portalCurrency || "",
              vpa: r.vpa || r.upiId || "",
              remainingLimitAmount: r.remainingLimitAmount ?? null,
              totalLimitAmount: r.totalLimitAmount ?? null,
              limitTime: r.limitTime ?? null,
              fttAcceptance: r.fttAcceptance ?? true,

              //  Bank details
              bankName: r.bankName || "",
              accountHolder: r.accountHolder || "",

              //  Time fields
              upiTime: r.upiTime || null,
              liveTime: r.liveTime || null,

              //Partial Payin
              partialPayinEnabled: r.partialPayinEnabled || false,
              partialPayinMinRange: r.partialPayinMinRange || 0,
            };
          });

          //  STEP 2: LOAD IMAGES
          this.upis.forEach((upi: any) => {
            if (!upi.imagePath) return;
            if (upi.imagePath.startsWith("http")) {
              upi.qrImageUrl = upi.imagePath;
            } else {
              this.multimediaService.getPrivateImage(upi.imagePath).subscribe({
                next: (url) => (upi.qrImageUrl = url),
                error: () => (upi.qrImageUrl = null),
              });
            }
          });

          //  STEP 3: SORT
          const now = new Date().getTime();
          this.upis.sort((a: any, b: any) => {
            const timeA = a.limitTime ? new Date(a.limitTime).getTime() : 0;
            const timeB = b.limitTime ? new Date(b.limitTime).getTime() : 0;
            const isFutureA = timeA > now;
            const isFutureB = timeB > now;
            if (isFutureA && !isFutureB) return -1;
            if (!isFutureA && isFutureB) return 1;
            if (isFutureA && isFutureB) return timeB - timeA;
            return timeB - timeA;
          });

          this.totalElements = responseData.totalElements || this.upis.length;
          this.totalPagesCount = responseData.totalPages || 1;
        },
        error: () => {
          this.upis = [];
          this.totalElements = 0;
          this.totalPagesCount = 0;
          this.snack.show("Failed to load UPIs", false);
        },
      });
  }

  // =============================================
  //  normalizeStatus — Boolean PEHLE check karo
  // =============================================
  private normalizeStatus(item: any): string {
    //  Boolean check PEHLE — status: true/false handle karo
    if (typeof item.status === "boolean") {
      return item.status ? "active" : "inactive";
    }
    // String check baad mein
    if (typeof item.status === "string" && item.status.trim() !== "") {
      return item.status.toLowerCase();
    }
    if (typeof item.active === "boolean") {
      return item.active ? "active" : "inactive";
    }
    return "inactive";
  }

  // ---------- FILTER ACTIONS ----------
  onSearch(): void {
    this.currentPage = 1;
    this.fetchUpis();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.fetchUpis();
  }

  clearLimitFilter(): void {
    this.maxLimit = null;
    this.onFilterChange();
  }

  clearTransactionFilter(): void {
    this.transactionMinAmount = null;
    this.transactionMaxAmount = null;
    this.onFilterChange();
  }

  resetFilters(): void {
    this.searchTerm = "";
    this.filterStatus = "";
    this.selectedPortal = null;
    this.portalSearchTerm = "";
    this.maxLimit = null;
    this.transactionMinAmount = null;
    this.transactionMaxAmount = null;
    this.showPortalDropdown = false;
    this.currentPage = 1;
  }

  // ---------- PORTAL FILTER ----------
  onPortalInputBlur(): void {
    setTimeout(() => (this.showPortalDropdown = false), 200);
  }

  filterPortals(): void {
    const term = this.portalSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredPortals = [...this.portals];
      this.showPortalDropdown = this.portals.length > 0;
    } else {
      this.filteredPortals = this.portals.filter(
        (site) =>
          site.domain.toLowerCase().includes(term) ||
          (site.currency && site.currency.toLowerCase().includes(term)),
      );
      this.showPortalDropdown = this.filteredPortals.length > 0;
    }
  }

  openPortalDropdown(): void {
    if (this.portals.length > 0) {
      this.filteredPortals = [...this.portals];
      this.showPortalDropdown = true;
    }
  }

  selectPortal(portal: any): void {
    this.selectedPortal = portal;
    this.portalSearchTerm = portal.domain;
    this.showPortalDropdown = false;
    this.onFilterChange();
  }

  clearPortalFilter(): void {
    this.selectedPortal = null;
    this.portalSearchTerm = "";
    this.filteredPortals = [...this.portals];
    this.showPortalDropdown = false;
    this.onFilterChange();
  }

  onUpiPortalSearch(): void {
    const term = (this.upiPortalSearch || "").trim().toLowerCase();
    this.showUpiPortalDropdown = true;
    if (!term) {
      this.upiFilteredPortals = [...this.portals];
      return;
    }
    this.upiFilteredPortals = this.portals.filter(
      (site) =>
        site.domain.toLowerCase().includes(term) ||
        (site.currency && site.currency.toLowerCase().includes(term)),
    );
  }

  // ---------- PAGINATION ----------
  totalPages(): number {
    return this.totalPagesCount;
  }

  updatePageNumbers(): void {
    const pages: number[] = [];
    const total = this.totalPagesCount;

    const prev = this.currentPage - 1;
    const next = this.currentPage + 1;

    if (prev >= 1) {
      pages.push(prev);
    }

    pages.push(this.currentPage);

    if (next <= total) {
      pages.push(next);
    }

    this.pageNumbers = pages;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePageNumbers();
      this.fetchUpis();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPagesCount) {
      this.currentPage++;
      this.updatePageNumbers();
      this.fetchUpis();
    }
  }

  goToPage(page: number | string): void {
    if (typeof page === "number") {
      this.currentPage = page;
      this.updatePageNumbers();
      this.fetchUpis();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePageNumbers();
    this.fetchUpis();
  }

  // ---------- DELETE (toggleUpiStatus) ----------
  toggleUpiStatus(upi: any): void {
    const oldStatus = upi.status;
    upi.status = oldStatus === "active" ? "inactive" : "active";

    this.upiService.toogleUpiDeleted(upi.id).subscribe({
      next: (res: any) => {
        this.snack.show(res?.message || "UPI status updated", true);

        this.fetchUpis();
      },
      error: (err) => {
        upi.status = oldStatus;

        this.snack.show(
          err?.error?.message || "Failed to update status.",
          false,
        );
      },
    });
  }

  // ---------- UPDATE MODAL ----------
  openUpdateModal(upi: any): void {
    this.editingUpi = upi;
    this.updateForm = {
      vpa: upi.vpa || "",
      limitAmount: upi.limitAmount || "",
      status: upi.status || "active",
      maxAmount: upi.maxAmount || "",
      minAmount: upi.minAmount || "",
      fttAcceptance: upi.fttAcceptance ?? true,
      partialPayinEnabled: upi.partialPayinEnabled ?? true,
      partialPayinMinRange: upi.partialPayinMinRange ?? 0,
    };
    this.originalVpa = (upi.vpa || "").trim().toLowerCase();
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
      status: "active",
      fttAcceptance: true,
      partialPayinEnabled: true,
      partialPayinMinRange: 0,
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
    const original = this.originalVpa;
    this.vpaChanged = currentVpa !== original;
    if (this.vpaChanged) {
      this.newQrGenerated = false;
      this.updateQrData = null;
      this.generatedUpdateFile = null;
    }
    if (this.isValidUpiId(currentVpa)) {
      this.updateQrError = "";
    }
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

    if (this.isUpdatePartialPayinMinRangeInvalid) {
      this.snack.show(
        `Partial Payin Min Range must be less than the smallest capacity range (${this.smallestUpdateCapacityRangeLimit}).`,
        false,
      );
      return;
    }

    const qrFile = this.generatedUpdateFile || this.updateManualQrFile;

    const dtoPayload: any = {
      id: this.editingUpi.id || this.editingUpi.qrId,
      portal: this.editingUpi.portal,
      entityId: this.currentRoleId,
      entityType: this.role,
      vpa,
      limitAmount: limit.toString(),
      active: this.updateForm.status === "active",
      fttAcceptance: this.updateForm.fttAcceptance,
      partialPayinEnabled: this.updateForm.partialPayinEnabled,
      partialPayinMinRange: this.updateForm.partialPayinMinRange,
    };

    if (this.currentRoleId) {
      dtoPayload.entityId = this.currentRoleId;
    }

    const formData = new FormData();

    // DTO JSON blob
    formData.append(
      "dto",
      new Blob([JSON.stringify(dtoPayload)], {
        type: "application/json",
      }),
    );

    // FILE (binary QR image with filename)
    if (qrFile) {
      formData.append("file", qrFile, qrFile.name);
    }

    this.isSubmitting = true;

    this.upiService.updateUpi(formData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.fetchUpis();
        this.snack.show(res?.message || "UPI updated successfully!", true);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.snack.show(err?.error?.message || "Error updating UPI", false);
      },
    });
  }
  // ---------- QR GENERATION ----------
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
    setTimeout(() => this.captureQrImage(vpa, true), 600);
  }

  private captureQrImage(vpa: string, isForUpdate = false): void {
    try {
      const qrcodeElement = isForUpdate
        ? this.updateQrcodeElem
        : this.qrcodeElem;
      if (!qrcodeElement?.nativeElement) {
        this.finishQrGeneration(isForUpdate);
        return;
      }
      setTimeout(() => {
        const canvas = qrcodeElement.nativeElement.querySelector("canvas");
        if (!canvas) {
          this.finishQrGeneration(isForUpdate);
          return;
        }
        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) {
              const filename = `upi_qr_${this.sanitizeFilename(vpa)}_${Date.now()}.png`;
              if (isForUpdate) {
                this.generatedUpdateFile = new File([blob], filename, {
                  type: "image/png",
                });
                this.newQrGenerated = true;
              } else {
                this.generatedFile = new File([blob], filename, {
                  type: "image/png",
                });
              }
            }
            this.finishQrGeneration(isForUpdate);
          },
          "image/png",
          1.0,
        );
      }, 100);
    } catch (error) {
      this.finishQrGeneration(isForUpdate);
    }
  }

  private finishQrGeneration(isForUpdate: boolean): void {
    if (isForUpdate) this.isGeneratingUpdateQr = false;
    else this.generatingQr = false;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9_\-\.@]/gi, "_")
      .replace(/_{2,}/g, "_")
      .substring(0, 100);
  }

  downloadQr(): void {
    if (!this.generatedFile) return;
    const url = URL.createObjectURL(this.generatedFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = this.generatedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  removeGeneratedQr(): void {
    this.qrData = null;
    this.generatedFile = null;
  }

  removeGeneratedUpdateQr(): void {
    this.updateQrData = null;
    this.generatedUpdateFile = null;
    this.newQrGenerated = false;
  }

  // ---------- IMAGE MODAL ----------
  previewImage: string | null = null;

  openImageModal(imageUrl: string | null): void {
    if (!imageUrl) return;
    this.selectedImage = imageUrl;
    this.previewImage = imageUrl;
    document.body.style.overflow = "hidden";
  }

  closeImageModal(): void {
    this.selectedImage = null;
    this.previewImage = null;
    document.body.style.overflow = "auto";
  }

  downloadImage(): void {
    if (!this.selectedImage) return;
    const link = document.createElement("a");
    link.href = this.selectedImage;
    link.download = `qr-code-${Date.now()}.png`;
    link.click();
  }

  // ---------- UTILITY ----------
  getStatusClass(status: string): string {
    switch ((status || "").toString().toLowerCase()) {
      case "active":
        return "bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/50";
      case "inactive":
        return "bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/50";
      default:
        return "bg-[var(--color-muted)]/20 text-[var(--color-muted)] border-[var(--color-muted)]/50";
    }
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  // ---------- DROPDOWN ----------
  toggleActionsDropdown(upiId: string): void {
    this.activeDropdownUpiId =
      this.activeDropdownUpiId === upiId ? null : upiId;
  }

  toggleView(mode: "table" | "grid") {
    this.viewMode = mode;
  }

  // ---------- CLICK OUTSIDE ----------
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest(".portal-filter-container"))
      this.showPortalDropdown = false;
    if (!target.closest(".action-dropdown-wrapper"))
      this.activeDropdownUpiId = null;
    if (!target.closest(".upi-portal-container"))
      this.showUpiPortalDropdown = false;
    if (!target.closest(".payment-dropdown-wrapper"))
      this.showPaymentDropdown = false;
    if (!target.closest(".capacity-popup") && !target.closest("button")) {
      this.selectedCapacityAccount = null;
    }
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    this.showPortalDropdown = false;
    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(max-width: 800px)").matches
    ) {
      this.viewMode = "grid";
    }
  }

  changePaymentType(type: string): void {
    this.selectedMethod = type;
    this.showPaymentDropdown = false;
    this.router.navigate(["../", type], { relativeTo: this.route });
  }

  onUpiPortalFocus(): void {
    if (this.portals.length > 0 && !this.showUpiPortalDropdown) {
      this.showUpiPortalDropdown = true;
      this.onUpiPortalSearch();
    }
  }

  updateFrom(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].minRange = isNaN(value) ? null : value;
  }

  updateTo(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].maxRange = isNaN(value) ? null : value;
  }

  updateQuantity(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].quantity = isNaN(value) ? null : value;
  }

  addRange() {
    this.capacityRanges.push({
      minRange: null,
      maxRange: null,
      quantity: null,
    });
  }

  removeRange(index: number) {
    this.capacityRanges.splice(index, 1);
  }

  selectedId!: string;
  selectedPortalId!: string;
  selectedPayinId!: string;
  selectedMode!: "UPI" | "BANK";

  openCapacity(item: any, mode: "UPI" | "BANK") {
    this.selectedId = item.id;
    this.selectedPortalId = item.bankId || item.portal || item.portalID;
    this.selectedPayinId = item.payinId || item.id || item.qrId;
    this.selectedMode = mode;
    this.showCapacityModal = true;
  }

  // =============================================
  //  TOGGLE CONFIRM — Click handler
  // =============================================
  openUpiToggleConfirm(upi: any, event: Event) {
    event.preventDefault();
    this.toggleCandidateUpi = upi;
    this.isToggleConfirmVisible = true;
  }

  closeUpiToggleConfirm() {
    this.isToggleConfirmVisible = false;
    this.toggleCandidateUpi = null;
  }

  // =============================================
  //  executeUpiToggle — upiTime check FIXED
  // =============================================
  executeUpiToggle() {
    if (!this.toggleCandidateUpi) return;

    const upi = this.toggleCandidateUpi;

    //  Sirf ACTIVE → INACTIVE karne pe upiTime check karo
    if (upi.status === "active") {
      const upiTime = upi.upiTime ? new Date(upi.upiTime).getTime() : null;
      const now = new Date().getTime();

      if (upiTime && upiTime > now) {
        //  upiTime future mein hai → inactive nahi karo
        this.snack.show(
          "UPI Time abhi future mein hai, inactive nahi kar sakte!",
          false,
        );
        this.isToggleConfirmVisible = false;
        this.toggleCandidateUpi = null;
        return; //  return — API call nahi hogi
      }
    }

    //  Normal flow — API call
    this.upiService.toggleIsUpi(upi.id).subscribe({
      next: () => {
        //  Dono sync karo
        upi.isUpiActive = !upi.isUpiActive;
        upi.status = upi.status === "active" ? "inactive" : "active";
        this.isToggleConfirmVisible = false;
        this.toggleCandidateUpi = null;
        this.fetchUpis(); // fresh data
      },
      error: (err: any) => {
        this.snack.show(
          err?.error?.message || "Failed to toggle status.",
          false,
        );
        this.isToggleConfirmVisible = false;
        this.toggleCandidateUpi = null;
      },
    });
  }

  // =============================================
  //  isAssigned — liveTime future = Assigned
  // =============================================
  isAssigned(upi: any): boolean {
    return upi.liveAssigned === true;
  }

  isFutureLimitTime(limitTime: string | Date): boolean {
    if (!limitTime) return false;
    return new Date(limitTime).getTime() > new Date().getTime();
  }

  manualQrFile: File | null = null;

  onQrFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.manualQrFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
    };
    reader.readAsDataURL(file);
    this.generatedFile = file;
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

  removeQr() {
    this.qrData = null;
    this.generatedFile = null;
    this.manualQrFile = null;
    this.selectedImage = null;
  }

  setQrMode(mode: "generate" | "upload") {
    this.qrMode = mode;
    this.qrData = null;
    this.selectedImage = null;
    this.manualQrFile = null;
    this.generatedFile = null;
  }

  removeUpdateQr() {
    this.updateQrData = null;
    this.updateSelectedImage = null;
    this.updateManualQrFile = null;
    this.generatedUpdateFile = null;
  }

  showTooltip(event: MouseEvent, data: any) {
    this.tooltipVisible = true;
    this.tooltipData = data;
    this.tooltipX = event.clientX + 15;
    this.tooltipY = event.clientY + 15;
  }

  hideTooltip() {
    this.tooltipVisible = false;
  }

  private getPayinStatus() {
    if (this.role === "HEAD") {
      this.headService.getHeadById(this.currentRoleId).subscribe((res) => {
        this.payinStatus = res.payin;
      });
    } else if (this.role === "BRANCH") {
      this.branchService.getBranchById(this.currentRoleId).subscribe((res) => {
        this.payinStatus = res.payin;
      });
    }
  }

  changePayinStatus() {
    if (this.role === "HEAD") {
      this.headService
        .toggleDashbaordPayin(this.currentRoleId)
        .subscribe(() => {
          this.payinStatus = !this.payinStatus;
        });
    } else if (this.role === "BRANCH") {
      this.branchService
        .toggleDashbaordPayin(this.currentRoleId)
        .subscribe(() => {
          this.payinStatus = !this.payinStatus;
        });
    }
  }

  loadBanks() {
    this.bankServices
      .getBankDataWithSubAdminIdAndActivePaginated(this.currentRoleId)
      .subscribe({
        next: (res: any) => {
          const banks = res?.data?.content || [];
          this.banks = banks;
          this.filteredBanks = banks;
          if (this.preselectedBankId) {
            const matchedBank = this.banks.find(
              (b: any) => String(b.id) === String(this.preselectedBankId),
            );

            if (matchedBank) {
              this.selectBank(matchedBank);
            }
          }
        },
        error: () => {
          this.banks = [];
          this.filteredBanks = [];
        },
      });
  }

  filterBanks() {
    const term = this.bankSearchTerm.toLowerCase();
    this.filteredBanks = this.banks.filter((b) =>
      b.accountHolderName.toLowerCase().includes(term),
    );
  }

  selectBank(bank: any) {
    this.preselectedBankId = null;
    this.selectedBank = bank;
    this.bankSearchTerm = bank.accountHolderName;
    this.showBankDropdown = false;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { bankId: bank.id },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });

    this.onFilterChange();
  }
  clearBankFilter() {
    this.selectedBank = null;
    this.bankSearchTerm = "";
    this.filteredBanks = [...this.banks];

    // URL se bankId hatao
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { bankId: null },
      queryParamsHandling: "merge", // baaki params (currency, mode) rehne denge, sirf bankId nikalega
      replaceUrl: true,
    });

    this.onFilterChange();
  }

  onBankBlur() {
    setTimeout(() => (this.showBankDropdown = false), 200);
  }

  // =============================================
  //  isLive — payinStatus + isUpiActive
  // =============================================
  isLive(upi: any): boolean {
    const now = Date.now();

    const limitTime = upi.limitTime ? new Date(upi.limitTime).getTime() : null;

    const upiTime = upi.upiTime ? new Date(upi.upiTime).getTime() : null;

    const status =
      upi.status === true ? true : upiTime != null ? upiTime > now : false;

    if (limitTime !== null && limitTime > now && status) {
      return true;
    }

    return false;
  }

  getRemainingTime(upi: any): string {
    if (!upi?.upiTime) {
      return "  ";
    }

    const diff = new Date(upi.upiTime).getTime() - Date.now();

    if (diff <= 0) {
      return "";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    return `   ${minutes}m ${seconds}s`;
  }

  openAddUpiModal() {
    this.showInventoryModal = true;
  }

  closeInventoryModal() {
    this.showInventoryModal = false;
  }

  getUpiUsedAmount(upi: any): number {
    const limitAmount = Number(upi.limitAmount || 0);
    const remaining = Number(upi.remainingLimitAmount || 0);
    return Math.max(limitAmount - remaining, 0);
  }

  showUpiLimitTooltip(upi: any, event: MouseEvent): void {
    clearTimeout(this.limitHoverTimeout);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.limitTooltipPosition = {
      x: rect.left + rect.width / 2 - 144,
      y: rect.bottom + 8,
    };
    this.hoveredLimitUpi = upi;
  }

  hideUpiLimitTooltip(): void {
    this.limitHoverTimeout = setTimeout(() => {
      this.hoveredLimitUpi = null;
    }, 150);
  }

  clearUpiLimitHide(): void {
    clearTimeout(this.limitHoverTimeout);
  }

  openUpiLimitDetails(upi: any): void {
    this.selectedLimitUpi = upi;
  }

  closeUpiLimitDetails(): void {
    this.selectedLimitUpi = null;
  }
  submitLimitTime() {
    // Build limitDateTime from picker state
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
    this.limitDateTime = new Date(
      selected.getTime() - selected.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);

    if (!this.limitDateTime || !this.editingUpi) return;
    const selectedTime = new Date(this.limitDateTime).getTime();
    const nowTime = new Date().getTime();
    if (selectedTime < nowTime) {
      this.snack.show("Please select a future date and time", false);
      return;
    }
    this.isSubmittingLimit = true;
    const payload = { dateTime: this.limitDateTime };
    const id = this.editingUpi.id;
    this.upiService.setLimitTime(id, payload).subscribe({
      next: (res) => {
        this.snack.show("Limit time set successfully", true);
        this.closeLimitModal();
        this.isSubmittingLimit = false;
        this.fetchUpis();
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
  openLimitModal(account: any) {
    this.editingUpi = account;
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
  closeLimitModal() {
    this.showLimitModal = false;
    this.limitDateTime = "";
    this.minLimitDateTime = "";
  }
  openCapacityPreview(account: any, event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    this.selectedCapacityAccount = account;

    const popupWidth = 280;

    // Approx dynamic height
    const rows = account?.ranges?.length || 0;
    const popupHeight = Math.max(120, rows * 56 + 70);

    // Center align with clicked icon/button
    let left = rect.left + rect.width / 2 - popupWidth / 2;
    let top = rect.bottom + 8;

    // If bottom overflow -> show above
    if (top + popupHeight > window.innerHeight) {
      top = rect.top - popupHeight - 8;
    }

    // If still going outside top
    if (top < 10) {
      top = 10;
    }

    // Horizontal boundaries
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

  get smallestUpdateCapacityRangeLimit(): number | null {
    const ranges = this.editingUpi?.ranges || [];
    const validRanges = ranges.filter(
      (r: any) => r.minRange != null && r.minRange > 0,
    );
    if (!validRanges.length) return null;
    return Math.min(...validRanges.map((r: any) => r.minRange));
  }

  get isUpdatePartialPayinMinRangeInvalid(): boolean {
    if (!this.updateForm?.partialPayinEnabled) return false;

    const max = this.smallestUpdateCapacityRangeLimit;
    if (max == null) return false;

    const val = this.updateForm?.partialPayinMinRange;
    return val != null && Number(val) >= max; // >= per your earlier requirement
  }
}
