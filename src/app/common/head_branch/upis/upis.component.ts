
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

  // ---------- USER / ROLE ----------
  currentRoleId: any;
  currentUserId: any;
  role: any;
  userId: any;

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

    this.getPayinStatus();
    this.updatePageNumbers();

    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(max-width: 800px)").matches
    ) {
      this.viewMode = "grid";
    }

    this.route.queryParams.subscribe((params) => {
      this.preselectedBankId = params["bankId"] || null;
    });

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
  // ✅ FETCH UPIS — COMPLETE FIX
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

          // ✅ STEP 1: MAP — normalizedStatus se isUpiActive bhi set karo
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

            // ✅ KEY FIX: normalizedStatus pehle calculate karo
            const normalizedStatus = this.normalizeStatus(r);

            return {
              ...r,
              status: r.status, // ✅ 'active' / 'inactive' string
              isUpiActive: normalizedStatus === "active", // ✅ status se sync — r.upi nahi
              liveAssigned: r.liveAssigned ?? false,
              portalDomain:
                r.portalDomain || r.portalName || r.portal || r.bankId || "",
              ranges: parsedRanges,
              qrId: r.qrId || r.qr_id || r.id || "",
              imagePath: rawImagePath,
              qrImageUrl: null,
              limitAmount: r.limitAmount,
              currency: r.portalCurrency || "",
              vpa: r.vpa || r.upiId || "",

              // ✅ Bank details
              bankName: r.bankName || "",
              accountHolder: r.accountHolder || "",

              // ✅ Time fields
              upiTime: r.upiTime || null,
              liveTime: r.liveTime || null,
            };
          });

          // ✅ STEP 2: LOAD IMAGES
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

          // ✅ STEP 3: SORT
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
  // ✅ normalizeStatus — Boolean PEHLE check karo
  // =============================================
  private normalizeStatus(item: any): string {
    // ✅ Boolean check PEHLE — status: true/false handle karo
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
    this.fetchUpis();
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
    this.updateForm = { vpa: "", limitAmount: "", status: "active" };
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

    if (!vpa) {
      this.snack.show("UPI ID is required", false);
      return;
    }
    if (!this.isValidUpiId(vpa)) {
      this.snack.show("Please enter a valid UPI ID (e.g., name@bank)", false);
      return;
    }
    if (limit <= 0) {
      this.snack.show("Please enter a valid limit amount", false);
      return;
    }

    const statusBool = this.updateForm.status === "active";
    const dtoPayload: any = {
      id: this.editingUpi.id || this.editingUpi.qrId,
      portal: this.editingUpi.portal,
      entityId: this.currentRoleId,
      entityType: this.role,
      vpa: vpa,
      limitAmount: limit.toString(),
      active: statusBool,
    };
    if (this.currentRoleId) dtoPayload.branchId = this.currentRoleId;
    if (this.userId) dtoPayload.userId = this.userId;

    const formData = new FormData();
    const dtoBlob = new Blob([JSON.stringify(dtoPayload)], {
      type: "application/json",
    });
    formData.append("dto", dtoBlob);
    if (this.generatedUpdateFile) {
      formData.append(
        "file",
        this.generatedUpdateFile,
        this.generatedUpdateFile.name,
      );
    }

    this.isSubmitting = true;
    this.upiService.updateUpi(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.fetchUpis();
        this.snack.show("UPI updated successfully!", true);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.snack.show("Error updating UPI. Please try again.", false);
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
  // ✅ TOGGLE CONFIRM — Click handler
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
  // ✅ executeUpiToggle — upiTime check FIXED
  // =============================================
  executeUpiToggle() {
    if (!this.toggleCandidateUpi) return;

    const upi = this.toggleCandidateUpi;

    // ✅ Sirf ACTIVE → INACTIVE karne pe upiTime check karo
    if (upi.status === "active") {
      const upiTime = upi.upiTime ? new Date(upi.upiTime).getTime() : null;
      const now = new Date().getTime();

      if (upiTime && upiTime > now) {
        // ✅ upiTime future mein hai → inactive nahi karo
        this.snack.show(
          "UPI Time abhi future mein hai, inactive nahi kar sakte!",
          false,
        );
        this.isToggleConfirmVisible = false;
        this.toggleCandidateUpi = null;
        return; // ✅ return — API call nahi hogi
      }
    }

    // ✅ Normal flow — API call
    this.upiService.toggleIsUpi(upi.id).subscribe({
      next: () => {
        // ✅ Dono sync karo
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
  // ✅ isAssigned — liveTime future = Assigned
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
              (b: any) => b.id === this.preselectedBankId,
            );
            if (matchedBank) {
              this.selectedBank = matchedBank;
              this.bankSearchTerm = matchedBank.accountHolderName;
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
    this.onFilterChange();
  }

  clearBankFilter() {
    this.selectedBank = null;
    this.bankSearchTerm = "";
    this.filteredBanks = [...this.banks];
    this.onFilterChange();
  }

  onBankBlur() {
    setTimeout(() => (this.showBankDropdown = false), 200);
  }

  // =============================================
  // ✅ isLive — payinStatus + isUpiActive
  // =============================================
  isLive(upi: any): boolean {
    const now = Date.now();

    const upiTime = upi?.upiTime ? new Date(upi.upiTime).getTime() : null;

    // Payin OFF
    if (!this.payinStatus) {
      return false;
    }

    // Status ON
    if (upi.status === true) {
      return true;
    }

    // Status OFF → upiTime decides
    if (upi.status === false) {
      return upiTime ? upiTime > now : false;
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

  openTxnModal(upi: any) {
    this.selectedTxnData = upi;
    this.showTxnModal = true;
    document.body.style.overflow = "hidden";
  }

  closeTxnModal() {
    this.showTxnModal = false;
    this.selectedTxnData = null;
    document.body.style.overflow = "auto";
  }

  openAddUpiModal() {
    this.showInventoryModal = true;
  }

  closeInventoryModal() {
    this.showInventoryModal = false;
  }
}
