import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";

import baseUrl, { fileBaseUrl } from "../../../services/helper";
import { UpiService, UpiFilterOptions } from "../../../services/upi.service";
import { BranchService } from "../../../services/branch.service";
import { HeadService } from "../../../services/head.service";
import { UserStateService } from "../../../../store/user-state.service";
import { UserService } from "../../../services/user.service";

@Component({
  selector: "app-head-upi",
  templateUrl: "./head-upi.component.html",
  styleUrls: ["./head-upi.component.css"],
})
export class HeadUpiComponent implements OnInit {
  // ---------- DATA ----------
  upis: any[] = [];
  websites: any[] = [];

  // ---------- FILTERS (sent to backend) ----------
  searchTerm = "";
  filterStatus = ""; // 'active', 'inactive', or ''
  selectedWebsite: any = null;
  maxLimit: number | null = null; // 👈 NEW: max limit filter
  transactionMinAmount: number | null = null;
  transactionMaxAmount: number | null = null;

  // UI state for filters
  websiteSearchTerm = "";
  showWebsiteDropdown = false;
  filteredWebsites: any[] = [];

  // UI toggle for transaction filter section
  showAmountFilter = false;

  // Computed properties for active filters
  get limitFilterActive(): boolean {
    return this.maxLimit !== null && this.maxLimit > 0;
  }
  get transactionFilterActive(): boolean {
    return !!(this.transactionMinAmount || this.transactionMaxAmount);
  }

  // Image preview
  selectedImage: string | null = null;

  // ---------- ADD MODAL ----------
  showAddModal = false;
  isAddingUpi = false;
  addUpiForm!: FormGroup;
  generatingQr = false;
  qrData: string | null = null;
  generatedFile: File | null = null;
  upiWebsiteSearch = "";
  upiFilteredWebsites: any[] = [];
  selectedUpiWebsite: any = null;

  // ---------- UPDATE MODAL ----------
  showUpdateModal = false;
  editingUpi: any = null;
  updateForm: any = {
    vpa: "",
    limitAmount: "",
    status: "active",
    minAmount: "",
    maxAmount: "",
  };
  isSubmitting = false;
  isGeneratingUpdateQr = false;
  updateQrData: string | null = null;
  generatedUpdateFile: File | null = null;
  originalVpa = "";
  updateQrError = "";

  // ---------- USER / ROLE ----------
  currentRoleId: any;
  currentUserId: any;
  role: any;
  userId: any;

  // ---------- PAGINATION (server‑driven) ----------
  currentPage = 1;
  pageSize = 5;
  totalElements = 0;
  totalPagesCount = 0;
  Math = Math;

  // ---------- QR CODE VIEWER ----------
  @ViewChild("qrcodeElem", { static: false, read: ElementRef })
  qrcodeElem!: ElementRef;
  @ViewChild("updateQrcodeElem", { static: false, read: ElementRef })
  updateQrcodeElem!: ElementRef;

  private vpaPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  // Success toast
  showUpdateSuccessPopup = false;
  updateSuccessMessage = "";
  private successPopupTimeout: any;

  // Dropdown
  activeDropdownUpiId: string | null = null;

  // ---------- ACTIVE FILTERS COUNT ----------
  get activeFilters(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.filterStatus) count++;
    if (this.selectedWebsite) count++;
    if (this.limitFilterActive) count++;
    if (this.transactionFilterActive) count++;
    return count;
  }

  constructor(
    private upiService: UpiService,
    private branchService: BranchService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private userStateService: UserStateService,
    private userService: UserService,
    private headService: HeadService,
  ) {}

  ngOnInit() {
    this.initAddUpiForm();
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.fetchUpis();
    this.loadWebsites(this.currentRoleId);
  }

  // ---------- FORM INIT ----------
  private initAddUpiForm() {
    this.addUpiForm = this.formBuilder.group({
      websiteId: ["", Validators.required],
      vpa: [
        "",
        [
          Validators.required,
          Validators.pattern(this.vpaPattern),
          Validators.minLength(5),
        ],
      ],
      limitAmount: [
        "",
        [Validators.required, Validators.min(1), Validators.max(10000000)],
      ],
      minAmount: [
        "",
        [Validators.required, Validators.min(1), Validators.max(10000000)],
      ],
      maxAmount: [
        "",
        [Validators.required, Validators.min(1), Validators.max(10000000)],
      ],
    });
  }

  // ---------- FETCH UPIs (server‑side pagination & filtering) ----------
  fetchUpis(): void {
    if (!this.currentRoleId) return;

    const options: UpiFilterOptions = {
      page: this.currentPage - 1,
      size: this.pageSize,
      query: this.searchTerm.trim() || undefined,
      minAmount: this.transactionMinAmount ?? undefined,
      maxAmount: this.transactionMaxAmount ?? undefined,
      limit: this.maxLimit ?? undefined, // 👈 NEW: send max limit
      websiteId: this.selectedWebsite?.id || undefined,
    };

    if (this.filterStatus === "active") options.active = true;
    if (this.filterStatus === "inactive") options.active = false;

    this.upiService
      .getByBranchIdPaginated(this.currentRoleId, options)
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res.content) ? res.content : [];
          this.upis = rows.map((r: any) => ({
            ...r,
            status: this.normalizeStatus(r),
            websiteDomain:
              r.websiteDomain ||
              r.websiteName ||
              r.website ||
              r.websiteId ||
              "",
            upiRange: r.range || r.upiRange || r.bankRange || "",
            qrId: r.qrId || r.qr_id || r.id || "",
            qrImagePath: r.qrImagePath
              ? `${fileBaseUrl}/${r.qrImagePath}`
              : r.qrImageUrl
                ? `${fileBaseUrl}/${r.qrImageUrl}`
                : null,
            limitAmount: r.limitAmount,
            vpa: r.vpa || r.upiId || "",
            minAmount: r.minAmount || 0,
            maxAmount: r.maxAmount || 0,
          }));

          this.totalElements = res.totalElements || 0;
          this.totalPagesCount = res.totalPages || 0;
        },
        error: (err: any) => {
          console.error("Error loading UPIs:", err);
          this.upis = [];
          this.totalElements = 0;
          this.totalPagesCount = 0;
        },
      });
  }

  private normalizeStatus(item: any): string {
    if (typeof item.status === "string" && item.status.trim() !== "") {
      return item.status.toLowerCase();
    }
    if (typeof item.active === "boolean") {
      return item.active ? "active" : "inactive";
    }
    if (typeof item.status === "boolean") {
      return item.status ? "active" : "inactive";
    }
    return "inactive";
  }

  // ---------- WEBSITES LOADING ----------
  loadWebsites(agentId: string) {
    if (!agentId) return;
    this.headService
      .getAllHeadsWithWebsitesById(agentId, "UPI")
      .pipe(catchError(() => of([])))
      .subscribe((res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data) list = res.data;
        else if (res) list = [res];

        this.websites = list.map((item) => ({
          id: item.id || item._id || "",
          websiteId: item.websiteId || item.websiteID || item.website_id || "",
          domain:
            item.websiteDomain ||
            item.domain ||
            item.domainName ||
            "Untitled Website",
          currency: item.currency || "INR",
        }));

        this.filteredWebsites = [...this.websites];
        this.upiFilteredWebsites = [];
      });
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
    this.selectedWebsite = null;
    this.websiteSearchTerm = "";
    this.maxLimit = null; // 👈 NEW: reset max limit
    this.transactionMinAmount = null;
    this.transactionMaxAmount = null;
    this.showWebsiteDropdown = false;
    this.currentPage = 1;
    this.fetchUpis();
  }

  // ---------- WEBSITE FILTER DROPDOWN ----------
  onWebsiteInputBlur(): void {
    setTimeout(() => (this.showWebsiteDropdown = false), 200);
  }

  filterWebsites(): void {
    const term = this.websiteSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredWebsites = [...this.websites];
      this.showWebsiteDropdown = this.websites.length > 0;
    } else {
      this.filteredWebsites = this.websites.filter(
        (site) =>
          site.domain.toLowerCase().includes(term) ||
          (site.currency && site.currency.toLowerCase().includes(term)),
      );
      this.showWebsiteDropdown = this.filteredWebsites.length > 0;
    }
  }

  openWebsiteDropdown(): void {
    if (this.websites.length > 0) {
      this.filteredWebsites = [...this.websites];
      this.showWebsiteDropdown = true;
    }
  }

  selectWebsite(website: any): void {
    this.selectedWebsite = website;
    this.websiteSearchTerm = website.domain;
    this.showWebsiteDropdown = false;
    this.onFilterChange();
  }

  clearWebsiteFilter(): void {
    this.selectedWebsite = null;
    this.websiteSearchTerm = "";
    this.filteredWebsites = [...this.websites];
    this.showWebsiteDropdown = false;
    this.onFilterChange();
  }

  // ---------- ADD MODAL WEBSITE SEARCH ----------
  onUpiWebsiteSearch(): void {
    const term = (this.upiWebsiteSearch || "").trim().toLowerCase();
    this.upiFilteredWebsites = term
      ? this.websites.filter(
          (site) =>
            site.domain.toLowerCase().includes(term) ||
            (site.currency && site.currency.toLowerCase().includes(term)),
        )
      : [];
  }

  selectUpiWebsite(site: any): void {
    this.selectedUpiWebsite = site;
    this.addUpiForm.patchValue({ websiteId: site.id });
    this.addUpiForm.get("websiteId")?.markAsTouched();
    this.upiWebsiteSearch = site.domain;
    this.upiFilteredWebsites = [];
  }

  clearUpiWebsiteSelection(): void {
    this.selectedUpiWebsite = null;
    this.upiWebsiteSearch = "";
    this.upiFilteredWebsites = [];
    this.addUpiForm.patchValue({ websiteId: "" });
    this.addUpiForm.get("websiteId")?.markAsTouched();
  }

  // ---------- PAGINATION ----------
  totalPages(): number {
    return this.totalPagesCount;
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages();
    const current = this.currentPage;
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l = 0;

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) rangeWithDots.push(l + 1);
        else if (i - l !== 1) rangeWithDots.push("...");
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchUpis();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
      this.fetchUpis();
    }
  }

  goToPage(page: number | string): void {
    if (typeof page === "number") {
      this.currentPage = page;
      this.fetchUpis();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchUpis();
  }

  // ---------- TOGGLE STATUS ----------
  toggleUpiStatus(upi: any): void {
    const newStatus = upi.status === "active" ? "inactive" : "active";
    upi.status = newStatus;
    this.upiService.toogleUpiStatus(upi.id).subscribe({
      next: () => this.fetchUpis(),
      error: (err) => {
        console.error("Error toggling status:", err);
        upi.status = upi.status === "active" ? "inactive" : "active";
        alert("Failed to update status.");
      },
    });
  }

  // ---------- ADD MODAL ----------
  openAddModal(): void {
    if (!this.websites?.length) this.loadWebsites(this.currentRoleId);
    this.selectedUpiWebsite = null;
    this.upiWebsiteSearch = "";
    this.upiFilteredWebsites = [];
    this.showAddModal = true;
    document.body.style.overflow = "hidden";
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addUpiForm.reset();
    this.qrData = null;
    this.generatedFile = null;
    this.isAddingUpi = false;
    this.selectedUpiWebsite = null;
    this.upiWebsiteSearch = "";
    this.upiFilteredWebsites = [];
    document.body.style.overflow = "auto";
  }

  submitAddUpi(): void {
    Object.keys(this.addUpiForm.controls).forEach((key) =>
      this.addUpiForm.get(key)?.markAsTouched(),
    );

    if (this.addUpiForm.invalid) {
      alert("Please fill all required fields correctly.");
      return;
    }

    if (!this.generatedFile) {
      alert("Please generate QR code first.");
      return;
    }

    const selectedWebsite = this.websites.find(
      (site) => String(site.id) === String(this.addUpiForm.value.websiteId),
    );
    if (!selectedWebsite) {
      alert("Selected website not found.");
      return;
    }

    const payload = {
      website: selectedWebsite.websiteId,
      websiteId: selectedWebsite.id,
      vpa: this.addUpiForm.value.vpa,
      limitAmount: this.addUpiForm.value.limitAmount,
      agent_id: this.currentRoleId,
      entityId: this.currentRoleId,
      entityType: this.role,
      userId: this.userId,
      active: true,
      createdAt: new Date().toISOString(),
      minAmount: this.addUpiForm.value.minAmount,
      maxAmount: this.addUpiForm.value.maxAmount,
    };

    const formData = new FormData();
    const dtoBlob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    formData.append("dto", dtoBlob);
    formData.append("file", this.generatedFile, this.generatedFile.name);

    if (this.currentRoleId) formData.append("agent_id", this.currentRoleId);
    if (this.currentRoleId) formData.append("branchId", this.currentRoleId);
    if (this.userId) formData.append("userId", this.userId);

    this.isAddingUpi = true;

    this.upiService.add(formData).subscribe({
      next: (response: any) => {
        this.isAddingUpi = false;
        if (response.success || response.id || response._id) {
          alert("UPI added successfully!"); // 👈 your alert preserved
          this.closeAddModal();
          this.fetchUpis(); // 👈 refresh list
        } else {
          alert(response.message || "Failed to add UPI.");
        }
      },
      error: (error: any) => {
        console.error("Error adding UPI:", error);
        this.isAddingUpi = false;
        alert("Failed to add UPI. Please check your connection and try again.");
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
    this.originalVpa = upi.vpa || "";
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
      minAmount: "",
      maxAmount: "",
    };
    this.originalVpa = "";
    this.updateQrData = null;
    this.generatedUpdateFile = null;
    this.isSubmitting = false;
    this.isGeneratingUpdateQr = false;
    this.updateQrError = "";
    this.closeUpdateSuccessPopup();
    document.body.style.overflow = "auto";
  }

  onUpdateVpaChange(): void {
    if (this.isValidUpiId(this.updateForm.vpa)) {
      this.updateQrError = "";
    }
    this.removeGeneratedUpdateQr();
  }

  submitUpdate(): void {
    if (!this.editingUpi) return;

    const vpa = (this.updateForm.vpa || "").trim();
    const limit = parseFloat(this.updateForm.limitAmount) || 0;

    if (!vpa) {
      alert("UPI ID is required");
      return;
    }
    if (!this.isValidUpiId(vpa)) {
      alert("Please enter a valid UPI ID (e.g., name@bank)");
      return;
    }
    if (limit <= 0) {
      alert("Please enter a valid limit amount");
      return;
    }

    const minAmount =
      this.updateForm.minAmount !== "" && this.updateForm.minAmount != null
        ? String(this.updateForm.minAmount)
        : this.editingUpi.minAmount;
    const maxAmount =
      this.updateForm.maxAmount !== "" && this.updateForm.maxAmount != null
        ? String(this.updateForm.maxAmount)
        : this.editingUpi.maxAmount;
    const statusBool = this.updateForm.status === "active";

    const dtoPayload: any = {
      id: this.editingUpi.id || this.editingUpi.qrId,
      website: this.editingUpi.website,
      entityId: this.currentRoleId,
      entityType: this.role,
      vpa: vpa,
      limitAmount: limit.toString(),
      active: statusBool,
      minAmount,
      maxAmount,
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
        this.fetchUpis(); // 👈 refresh

        this.updateSuccessMessage = "UPI updated successfully!";
        this.showUpdateSuccessPopup = true;
        this.successPopupTimeout = setTimeout(() => {
          this.closeUpdateSuccessPopup();
        }, 3000);
      },
      error: (err: any) => {
        console.error("Error updating UPI:", err);
        this.isSubmitting = false;
        alert("Error updating UPI. Please try again.");
      },
    });
  }

  closeUpdateSuccessPopup(): void {
    clearTimeout(this.successPopupTimeout);
    this.showUpdateSuccessPopup = false;
    this.updateSuccessMessage = "";
  }

  // ---------- QR CODE GENERATION ----------
  isValidUpiId(vpa: string): boolean {
    return this.vpaPattern.test(vpa);
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
    this.generatingQr = true;

    setTimeout(() => this.captureQrImage(vpa, false), 300);
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

    setTimeout(() => this.captureQrImage(vpa, true), 300);
  }

  private captureQrImage(vpa: string, isForUpdate = false): void {
    try {
      const qrcodeElement = isForUpdate
        ? this.updateQrcodeElem
        : this.qrcodeElem;
      if (!qrcodeElement?.nativeElement) {
        console.error("QR code element not found");
        this.finishQrGeneration(isForUpdate);
        return;
      }

      setTimeout(() => {
        const canvas = qrcodeElement.nativeElement.querySelector("canvas");
        if (!canvas) {
          console.error("Canvas not found in QR component");
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
      console.error("Error capturing QR image:", error);
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
  }

  // ---------- IMAGE MODAL ----------
  openImageModal(imageUrl: string | null): void {
    if (!imageUrl) return;
    this.selectedImage = imageUrl;
    document.body.style.overflow = "hidden";
  }

  closeImageModal(): void {
    this.selectedImage = null;
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

  // ---------- DROPDOWN ----------
  toggleActionsDropdown(upiId: string): void {
    this.activeDropdownUpiId =
      this.activeDropdownUpiId === upiId ? null : upiId;
  }

  // ---------- CLICK OUTSIDE ----------
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const container = target.closest(".website-filter-container");
    if (!container && this.showWebsiteDropdown) {
      this.showWebsiteDropdown = false;
    }
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    this.showWebsiteDropdown = false;
  }
}
