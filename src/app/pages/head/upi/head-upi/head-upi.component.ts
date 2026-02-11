import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import baseUrl, { fileBaseUrl } from "../../../services/helper";
import { UpiService } from "../../../services/upi.service";
import { ActivatedRoute } from "@angular/router";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";
import { BranchService } from "../../../services/branch.service";
import { UserStateService } from "../../../../store/user-state.service";
import { UserService } from "../../../services/user.service";
import { HeadService } from "../../../services/head.service";

@Component({
  selector: "app-head-upi",
  templateUrl: "./head-upi.component.html",
  styleUrls: ["./head-upi.component.css"],
})
export class HeadUpiComponent implements OnInit {
  upis: any[] = [];
  filteredUpis: any[] = [];
  searchTerm = "";
  filterStatus = "";
  selectedImage: string | null = null;
  branchId: any;
  userId: any;
  websites: any[] = [];

  // Add modal properties
  showAddModal = false;
  isAddingUpi = false;
  addUpiForm!: FormGroup;
  generatingQr = false;
  qrData: string | null = null;
  generatedFile: File | null = null;

  // Update modal properties
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
  originalVpa: string = "";
  currentRoleId: any;
  currentUserId: any;
  role: any;

  // Filter properties
  websiteSearchTerm: string = "";
  selectedWebsite: any = null;
  showWebsiteDropdown: boolean = false;
  filteredWebsites: any[] = [];

  // TWO filter sets:
  // 1. Separate for Limit Amount
  limitMinAmount: number | null = null;
  limitMaxAmount: number | null = null;

  // 2. Combined for Transaction Range (applies to minAmount AND maxAmount)
  transactionMinAmount: number | null = null;
  transactionMaxAmount: number | null = null;

  // New property for amount filter dropdown
  showAmountFilter: boolean = false;

  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 5;

  @ViewChild("qrcodeElem", { static: false, read: ElementRef })
  qrcodeElem!: ElementRef;
  @ViewChild("updateQrcodeElem", { static: false, read: ElementRef })
  updateQrcodeElem!: ElementRef;

  private vpaPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  // Make Math available in template
  Math = Math;

  // Computed properties for filter states
  get limitFilterActive(): boolean {
    return !!(this.limitMinAmount || this.limitMaxAmount);
  }

  get transactionFilterActive(): boolean {
    return !!(this.transactionMinAmount || this.transactionMaxAmount);
  }

  // Computed property for active filters count
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

    // Load UPIs and websites
    this.loadUpis(this.currentRoleId);
    this.loadWebsites(this.currentRoleId);
  }

  // ==================== PAGINATION METHODS ====================
  pagedUpis() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredUpis.slice(startIndex, endIndex);
  }

  totalPages() {
    return Math.ceil(this.filteredUpis.length / this.pageSize);
  }

  getPageNumbers() {
    const total = this.totalPages();
    const current = this.currentPage;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

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
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
    }
  }

  goToPage(page: number | string) {
    if (typeof page === "number") {
      this.currentPage = page;
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
  }

  // ==================== UPI STATUS TOGGLE ====================
  toggleUpiStatus(upi: any) {
    console.log(upi);

    const newStatus = upi.status === "active" ? "inactive" : "active";
    upi.status = newStatus;

    this.upiService.toogleUpiStatus(upi.id).subscribe((res) => {
      alert(res);
    });
  }

  // ==================== WEBSITE FILTER METHODS ====================
  onWebsiteInputBlur() {
    // Small delay to allow click events to register
    setTimeout(() => {
      this.showWebsiteDropdown = false;
    }, 200);
  }

  filterWebsites() {
    const searchTerm = this.websiteSearchTerm.trim().toLowerCase();

    if (!searchTerm) {
      this.filteredWebsites = [...this.websites];
      this.showWebsiteDropdown = this.websites.length > 0;
      return;
    }

    this.filteredWebsites = this.websites.filter(
      (website) =>
        website.domain.toLowerCase().includes(searchTerm) ||
        (website.currency &&
          website.currency.toLowerCase().includes(searchTerm)),
    );

    this.showWebsiteDropdown = this.filteredWebsites.length > 0;
  }

  openWebsiteDropdown() {
    if (this.websites.length > 0) {
      this.filteredWebsites = [...this.websites];
      this.showWebsiteDropdown = true;
    }
  }

  selectWebsite(website: any) {
    this.selectedWebsite = website;
    this.websiteSearchTerm = website.domain;
    this.showWebsiteDropdown = false;

    // Apply filters immediately when website is selected
    setTimeout(() => {
      this.applyAllFilters();
    }, 100);
  }

  clearWebsiteFilter() {
    this.selectedWebsite = null;
    this.websiteSearchTerm = "";
    this.filteredWebsites = [...this.websites];
    this.showWebsiteDropdown = false;

    // Re-apply filters after clearing
    setTimeout(() => {
      this.applyAllFilters();
    }, 100);
  }

  // ==================== FILTERING METHODS ====================
  // Helper method for number range checking
  private checkNumberRange(
    value: number,
    min: number | null,
    max: number | null,
  ): boolean {
    if (value === null || value === undefined) return false;
    if (min !== null && value < min) return false;
    if (max !== null && value > max) return false;
    return true;
  }

  // Parse number input safely
  private parseNumberInput(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  // Main filter application method
  applyAllFilters() {
    const searchTerm = this.searchTerm.trim().toLowerCase();
    const statusFilter = this.filterStatus.trim().toLowerCase();

    // Parse all number filters
    const limitMinNum = this.parseNumberInput(this.limitMinAmount);
    const limitMaxNum = this.parseNumberInput(this.limitMaxAmount);
    const transMinNum = this.parseNumberInput(this.transactionMinAmount);
    const transMaxNum = this.parseNumberInput(this.transactionMaxAmount);

    this.filteredUpis = this.upis.filter((upi) => {
      // 1. Basic search filter
      const matchesSearch =
        !searchTerm ||
        (upi.websiteDomain || "").toLowerCase().includes(searchTerm) ||
        (upi.vpa || "").toLowerCase().includes(searchTerm) ||
        (upi.qrId || "").toString().toLowerCase().includes(searchTerm);

      // 2. Status filter
      const matchesStatus =
        !statusFilter || (upi.status || "").toLowerCase() === statusFilter;

      // 3. Website filter
      let matchesWebsite = true;
      if (this.selectedWebsite) {
        // Try to match by website ID first
        if (upi.websiteId && this.selectedWebsite.websiteId) {
          matchesWebsite = upi.websiteId === this.selectedWebsite.websiteId;
        }
        // Fallback to domain name matching
        else if (upi.websiteDomain && this.selectedWebsite.domain) {
          matchesWebsite = upi.websiteDomain
            .toLowerCase()
            .includes(this.selectedWebsite.domain.toLowerCase());
        } else {
          matchesWebsite = false;
        }
      }

      // 4. Limit Amount filter (separate for limitAmount field)
      let matchesLimit = true;
      if (limitMinNum !== null || limitMaxNum !== null) {
        const limitAmount = parseFloat(upi.limitAmount) || 0;
        matchesLimit = this.checkNumberRange(
          limitAmount,
          limitMinNum,
          limitMaxNum,
        );
      }

      // 5. Transaction Range filter (applies to BOTH minAmount AND maxAmount)
      let matchesTransaction = true;
      if (transMinNum !== null || transMaxNum !== null) {
        const minAmount = parseFloat(upi.minAmount) || 0;
        const maxAmount = parseFloat(upi.maxAmount) || 0;

        // Check if EITHER minAmount OR maxAmount falls within the range
        const matchesMin = this.checkNumberRange(
          minAmount,
          transMinNum,
          transMaxNum,
        );
        const matchesMax = this.checkNumberRange(
          maxAmount,
          transMinNum,
          transMaxNum,
        );

        // Show item if ANY of the transaction fields match
        matchesTransaction = matchesMin || matchesMax;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesWebsite &&
        matchesLimit &&
        matchesTransaction
      );
    });

    // Reset to first page after filtering
    this.currentPage = 1;
  }

  onSearch() {
    // Apply all filters when search term changes
    this.applyAllFilters();
  }

  onNumberFilterChange() {
    // Apply all filters when number inputs change
    this.applyAllFilters();
  }

  onAmountFilterChange() {
    // This method can be used as an alias for onNumberFilterChange
    this.applyAllFilters();
  }

  // Clear filter methods
  clearLimitFilter(): void {
    this.limitMinAmount = null;
    this.limitMaxAmount = null;
    this.applyAllFilters();
  }

  clearTransactionFilter(): void {
    this.transactionMinAmount = null;
    this.transactionMaxAmount = null;
    this.applyAllFilters();
  }

  resetFilters() {
    this.searchTerm = "";
    this.filterStatus = "";
    this.websiteSearchTerm = "";
    this.selectedWebsite = null;
    this.showWebsiteDropdown = false;
    this.filteredWebsites = [...this.websites];
    this.limitMinAmount = null;
    this.limitMaxAmount = null;
    this.transactionMinAmount = null;
    this.transactionMaxAmount = null;
    this.showAmountFilter = false; // Close the dropdown
    this.filteredUpis = [...this.upis];
    this.currentPage = 1;
  }

  // For backward compatibility
  resetAllFilters() {
    this.resetFilters();
  }

  // ==================== FORM INITIALIZATION ====================
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

  // ==================== MODAL METHODS ====================
  openAddModal() {
    if (this.websites === null || this.websites.length === 0) {
      this.loadWebsites(this.currentRoleId);
    }

    this.showAddModal = true;
    document.body.style.overflow = "hidden";
  }

  closeAddModal() {
    this.showAddModal = false;
    this.addUpiForm.reset();
    this.qrData = null;
    this.generatedFile = null;
    this.isAddingUpi = false;
    document.body.style.overflow = "auto";
  }

  openUpdateModal(upi: any) {
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
    this.showUpdateModal = true;
    document.body.style.overflow = "hidden";
  }

  closeUpdateModal() {
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
    document.body.style.overflow = "auto";
  }

  // ==================== QR CODE METHODS ====================
  // Check if UPI ID is valid
  isValidUpiId(vpa: string): boolean {
    return this.vpaPattern.test(vpa);
  }

  // Handle VPA change in update form
  onUpdateVpaChange() {
    if (this.updateForm.vpa !== this.originalVpa) {
      this.removeGeneratedUpdateQr();
    }
  }

  // Generate QR from VPA (for add modal)
  generateQrFromVpa() {
    const vpaControl = this.addUpiForm.get("vpa");
    if (!vpaControl || vpaControl.invalid) {
      vpaControl?.markAsTouched();
      return;
    }

    const vpa = String(vpaControl.value).trim();
    const upiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;
    this.qrData = upiIntent;
    this.generatingQr = true;

    setTimeout(() => {
      this.captureQrImage(vpa, false);
    }, 300);
  }

  // Generate QR for update modal
  generateQrForUpdate() {
    const vpa = String(this.updateForm.vpa).trim();

    if (!this.isValidUpiId(vpa)) {
      alert("Please enter a valid UPI ID first");
      return;
    }

    const upiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;
    this.updateQrData = upiIntent;
    this.isGeneratingUpdateQr = true;

    setTimeout(() => {
      this.captureQrImage(vpa, true);
    }, 300);
  }

  private captureQrImage(vpa: string, isForUpdate: boolean = false) {
    try {
      const qrcodeElement = isForUpdate
        ? this.updateQrcodeElem
        : this.qrcodeElem;

      if (!qrcodeElement?.nativeElement) {
        console.error("QR code element not found");
        if (isForUpdate) {
          this.isGeneratingUpdateQr = false;
        } else {
          this.generatingQr = false;
        }
        return;
      }

      setTimeout(() => {
        const canvas = qrcodeElement.nativeElement.querySelector("canvas");
        if (!canvas) {
          console.error("Canvas not found in QR component");
          if (isForUpdate) {
            this.isGeneratingUpdateQr = false;
          } else {
            this.generatingQr = false;
          }
          return;
        }

        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) {
              const filename = `upi_qr_${this.sanitizeFilename(
                vpa,
              )}_${Date.now()}.png`;
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

            if (isForUpdate) {
              this.isGeneratingUpdateQr = false;
            } else {
              this.generatingQr = false;
            }
          },
          "image/png",
          1.0,
        );
      }, 100);
    } catch (error) {
      console.error("Error capturing QR image:", error);
      if (isForUpdate) {
        this.isGeneratingUpdateQr = false;
      } else {
        this.generatingQr = false;
      }
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9_\-\.@]/gi, "_")
      .replace(/_{2,}/g, "_")
      .substring(0, 100);
  }

  downloadQr() {
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

  removeGeneratedQr() {
    this.qrData = null;
    this.generatedFile = null;
  }

  removeGeneratedUpdateQr() {
    this.updateQrData = null;
    this.generatedUpdateFile = null;
  }

  // ==================== DATA LOADING METHODS ====================
  loadWebsites(agentId: string) {
    if (!agentId) return;

    this.headService
      .getAllHeadsWithWebsitesById(agentId, "UPI")
      .pipe(
        catchError((err: any) => {
          console.error("Error loading websites:", err);
          return of([]);
        }),
      )
      .subscribe((res: any) => {
        let websitesList: any[] = [];

        if (Array.isArray(res)) {
          websitesList = res;
        } else if (res && Array.isArray(res.data)) {
          websitesList = res.data;
        } else if (res) {
          websitesList = [res];
        }

        this.websites = websitesList.map((item) => ({
          id: item.id || item._id || "",
          websiteId: item.websiteId || item.websiteID || item.website_id || "",
          domain:
            item.websiteDomain ||
            item.domain ||
            item.domainName ||
            "Untitled Website",
          currency: item.currency || "INR",
        }));

        // Initialize filtered websites
        this.filteredWebsites = [...this.websites];
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

  loadUpis(id: any) {
    this.upiService.getBybranchId(id).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res.data) ? res.data : [];

        this.upis = rows.map((r: any) => {
          const status = this.normalizeStatus(r);

          return {
            ...r,
            status,
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
          };
        });

        this.filteredUpis = [...this.upis];
        this.currentPage = 1; // Reset to first page when data loads
      },
      error: (err: any) => {
        console.error("Error loading UPIs:", err);
        this.upis = [];
        this.filteredUpis = [];
      },
    });
  }

  // ==================== FORM SUBMISSION METHODS ====================
  // Submit add UPI form
  submitAddUpi() {
    Object.keys(this.addUpiForm.controls).forEach((key) => {
      const control = this.addUpiForm.get(key);
      control?.markAsTouched();
    });

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
          alert("UPI added successfully!");
          this.closeAddModal();
          this.loadUpis(this.currentRoleId);
        } else {
          alert(response.message || "Failed to add UPI. Please try again.");
        }
      },
      error: (error: any) => {
        console.error("Error adding UPI:", error);
        this.isAddingUpi = false;
        alert("Failed to add UPI. Please check your connection and try again.");
      },
    });
  }

  // Submit update form
  submitUpdate() {
    if (!this.editingUpi) return;

    const vpa = (this.updateForm.vpa || "").trim();
    const limitRaw = this.updateForm.limitAmount;
    const limit =
      typeof limitRaw === "string" ? parseFloat(limitRaw) : limitRaw;

    if (!vpa) {
      alert("UPI ID is required");
      return;
    }

    if (!this.isValidUpiId(vpa)) {
      alert("Please enter a valid UPI ID (e.g., name@bank)");
      return;
    }

    if (isNaN(limit) || limit <= 0) {
      alert("Please enter a valid limit amount");
      return;
    }

    this.isSubmitting = true;

    const statusBool = this.updateForm.status === "active" ? true : false;

    const dtoPayload: any = {
      id: this.editingUpi.id || this.editingUpi.qrId,
      website: this.editingUpi.website,
      entityId: this.currentRoleId,
      entityType: this.role,
      vpa: vpa,
      limitAmount: limit.toString(),
      active: statusBool,
      minAmount: this.updateForm.minAmount || this.editingUpi.minAmount,
      maxAmount: this.updateForm.maxAmount || this.editingUpi.maxAmount,
    };

    if (this.currentRoleId) dtoPayload.branchId = this.currentRoleId;
    if (this.userId) dtoPayload.userId = this.userId;

    const formData = new FormData();
    const dtoBlob = new Blob([JSON.stringify(dtoPayload)], {
      type: "application/json",
    });
    formData.append("dto", dtoBlob);

    // Only append file if a new QR was generated
    if (this.generatedUpdateFile) {
      formData.append(
        "file",
        this.generatedUpdateFile,
        this.generatedUpdateFile.name,
      );
    }

    this.upiService.updateUpi(formData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.loadUpis(this.currentRoleId);
        alert("UPI updated successfully!");
      },
      error: (err: any) => {
        console.error("Error updating UPI:", err);
        this.isSubmitting = false;
        alert("Error updating UPI. Please try again.");
      },
    });
  }

  // ==================== IMAGE MODAL METHODS ====================
  openImageModal(imageUrl: string | null) {
    if (!imageUrl) return;
    this.selectedImage = imageUrl;
    document.body.style.overflow = "hidden";
  }

  closeImageModal() {
    this.selectedImage = null;
    document.body.style.overflow = "auto";
  }

  downloadImage() {
    if (!this.selectedImage) return;
    const link = document.createElement("a");
    link.href = this.selectedImage;
    link.download = `qr-code-${Date.now()}.png`;
    link.click();
  }

  // ==================== UTILITY METHODS ====================
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

  // ==================== EVENT HANDLERS ====================
  // Close website dropdown when clicking outside
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    if (this.showWebsiteDropdown) {
      const target = event.target as HTMLElement;
      const websiteFilterContainer = target.closest(
        ".website-filter-container",
      );

      if (!websiteFilterContainer) {
        this.showWebsiteDropdown = false;
      }
    }
  }

  // Handle window resize for dropdown positioning
  @HostListener("window:resize")
  onWindowResize() {
    if (this.showWebsiteDropdown) {
      // Close dropdown on resize to avoid positioning issues
      this.showWebsiteDropdown = false;
    }
  }

  activeDropdownUpiId: string | null = null;

  toggleActionsDropdown(upiId: string) {
    this.activeDropdownUpiId =
      this.activeDropdownUpiId === upiId ? null : upiId;
  }
}
