import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import baseUrl, { fileBaseUrl } from "../../../services/helper";
import { UpiService } from "../../../services/upi.service";
import { BranchService } from "../../../services/branch.service";
import { HeadService } from "../../../services/head.service";
import { UserStateService } from "../../../../store/user-state.service";
import { UserService } from "../../../services/user.service";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { BankService } from "../../../services/bank.service";
import { MultimediaService } from "../../../services/multimedia.service";
@Component({
  selector: "app-head-upi",
  templateUrl: "./head-upi.component.html",
  styleUrls: ["./head-upi.component.css"],
})
export class HeadUpiComponent implements OnInit {
  // ---------- DATA ----------
  upis: any[] = [];
  portals: any[] = [];
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipData: any = null;
  // ---------- FILTERS (sent to backend) ----------
  searchTerm = "";
  private searchSubject = new Subject<string>();

  filterStatus = ""; // 'active', 'inactive', or ''
  selectedPortal: any = null;
  maxLimit: number | null = null; //  NEW: max limit filter
  transactionMinAmount: number | null = null;
  transactionMaxAmount: number | null = null;

  showPaymentDropdown = false;
  selectedMethod = "bank";

  // UI state for filters
  portalSearchTerm = "";
  showPortalDropdown = false;
  filteredPortals: any[] = [];
  // UI toggle for transaction filter section
  showAmountFilter = false;

  // Computed properties for active filters
  get limitFilterActive(): boolean {
    return this.maxLimit !== null && this.maxLimit > 0;
  }
  get transactionFilterActive(): boolean {
    return !!(this.transactionMinAmount || this.transactionMaxAmount);
  }
  topupStatus: any = false;

  // Image preview
  selectedImage: string | null = null;
  qrMode: "generate" | "upload" = "generate";
  vpaChanged: boolean = false;
  newQrGenerated: boolean = false;

  // ---------- ADD MODAL ----------
  showAddModal = false;
  isAddingUpi = false;
  addUpiForm!: FormGroup;
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

  // ---------- USER / ROLE ----------
  currentRoleId: any;
  currentUserId: any;
  role: any;
  userId: any;

  // ---------- PAGINATION (server‑driven) ----------
  currentPage = 1;
  pageSize = 6;
  totalElements = 0;
  totalPagesCount = 0;
  Math = Math;

  // ---------- QR CODE VIEWER ----------
  @ViewChild("qrcodeElem", { static: false, read: ElementRef })
  qrcodeElem!: ElementRef;
  @ViewChild("updateQrcodeElem", { static: false, read: ElementRef })
  updateQrcodeElem!: ElementRef;

  private vpaPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  // Dropdown
  activeDropdownUpiId: string | null = null;
  viewMode: "table" | "grid" = "table";
  showUpiPortalDropdown = false;
  // ---------- ACTIVE FILTERS COUNT ----------
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
  ) {}

  //   ngOnInit() {
  //     this.route.queryParams.subscribe((params) => {
  //   const bankId = params['bankId'];

  //   if (bankId) {
  //     this.preselectedBankId = bankId;
  //   }
  // });
  //     this.initAddUpiForm();
  //     this.currentRoleId = this.userStateService.getCurrentEntityId();
  //     this.currentUserId = this.userStateService.getUserId();
  //     this.role = this.userStateService.getRole();
  // this.getTopupStatus();
  //     if (
  //         typeof matchMedia !== "undefined" &&
  //         matchMedia("(max-width: 800px)").matches
  //     ) {
  //       this.viewMode = "grid";
  //     }

  //     this.fetchUpis();
  //     this.loadPortals(this.currentRoleId);

  //     this.searchSubject
  //         .pipe(debounceTime(600), distinctUntilChanged())
  //         .subscribe((value) => {
  //           this.searchTerm = value;
  //           this.onSearch();
  //         });

  //     this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];

  //     this.loadBanks();
  //   }

  ngOnInit() {
    this.initAddUpiForm();

    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.getTopupStatus();

    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(max-width: 800px)").matches
    ) {
      this.viewMode = "grid";
    }

    this.route.queryParams.subscribe((params) => {
      this.preselectedBankId = params["bankId"] || null;

      this.fetchUpis();
    });

    this.loadBanks();

    // this.loadPortals(this.currentRoleId);

    this.searchSubject
      .pipe(debounceTime(600), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm = value;
        this.onSearch();
      });

    this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];
  }

  private initAddUpiForm() {
    this.addUpiForm = this.formBuilder.group({
      // portalId: ["", Validators.required],
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
      min_tran_count: [null],
      max_tran_count: [null],
      min_total_tran_amount: [null],
      max_total_tran_amount: [null],
    });
  }

  openUpiPortalDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showUpiPortalDropdown = !this.showUpiPortalDropdown;
    if (this.showUpiPortalDropdown) {
      this.onUpiPortalSearch(); // refresh filtered list
    }
  }
  // amountRangeValidator(group: FormGroup): { [key: string]: any } | null {
  //   const min = group.get("minAmount")?.value;
  //   const max = group.get("maxAmount")?.value;

  //   if (min !== null && max !== null && Number(min) > Number(max)) {
  //     return { invalidRange: true };
  //   }
  //   return null;
  // }

  // ---------- FETCH UPIs (server‑side pagination & filtering) ----------
  //   fetchUpis(): void {
  //     if (!this.currentRoleId) return;

  //     const options: any = {
  //       page: this.currentPage - 1,
  //       size: this.pageSize,
  //       query: this.searchTerm.trim() || undefined,
  //       minAmount: this.transactionMinAmount ?? undefined,
  //       maxAmount: this.transactionMaxAmount ?? undefined,
  //       limit: this.maxLimit ?? undefined, //  NEW: send max limit
  //       portalId: this.selectedPortal?.portalId || undefined,
  //     };

  // if (this.filterStatus && this.filterStatus.trim() !== "") {
  //   options.status = this.filterStatus;
  // }

  //     this.upiService
  //       .getByEntityIdAndActivePaginatedWithStatus(this.currentRoleId, options)
  //       .subscribe({
  //         next: (res: any) => {
  //           const rows = Array.isArray(res.content) ? res.content : [];
  //           this.upis = rows.map((r: any) => ({
  //             ...r,
  //             status: this.normalizeStatus(r),
  //             portalDomain:
  //               r.portalDomain ||
  //               r.portalName ||
  //               r.portal ||
  //               r.portalId ||
  //               "",
  //             upiRange: r.range || r.upiRange || r.bankRange || "",
  //             qrId: r.qrId || r.qr_id || r.id || "",
  //             qrImagePath: r.qrImagePath
  //               ? `${fileBaseUrl}/${r.qrImagePath}`
  //               : r.qrImageUrl
  //                 ? `${fileBaseUrl}/${r.qrImageUrl}`
  //                 : null,
  //             limitAmount: r.limitAmount,
  //             vpa: r.vpa || r.upiId || "",
  //             isUpiActive: r.upi === true,
  //           }));

  //           this.totalElements = res.totalElements || 0;
  //           this.totalPagesCount = res.totalPages || 0;
  //         },
  //         error: (err: any) => {

  //           this.upis = [];
  //           this.totalElements = 0;
  //           this.totalPagesCount = 0;
  //         },
  //       });
  //   }

  fetchUpis(): void {
    if (!this.currentRoleId) return;

    const options: any = {
      page: this.currentPage - 1,
      size: this.pageSize,
      query: this.searchTerm.trim() || undefined,
      minAmount: this.transactionMinAmount ?? undefined,
      maxAmount: this.transactionMaxAmount ?? undefined,
      limit: this.maxLimit ?? undefined,
      portalId: this.selectedPortal?.portalId || undefined,
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

          //  STEP 1: MAP (FIXED)
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

            const rawImagePath = r.qrImagePath || r.qrImageUrl || null;

            return {
              ...r,
              status: this.normalizeStatus(r),
              min_tran_count: r.minTranCount ?? null,
              max_tran_count: r.maxTranCount ?? null,
              min_total_tran_amount: r.minTotalTranAmount ?? null,
              max_total_tran_amount: r.maxTotalTranAmount ?? null,
              portalDomain:
                r.portalDomain || r.portalName || r.portal || r.portalId || "",

              ranges: parsedRanges,

              qrId: r.qrId || r.qr_id || r.id || "",

              //  REMOVE direct URL
              // qrImagePath: ...

              //  NEW
              imagePath: rawImagePath,
              qrImageUrl: null,

              limitAmount: r.limitAmount,
              currency: r.portalCurrency || "",
              vpa: r.vpa || r.upiId || "",
              isUpiActive: r.upi === true,
            };
          });

          //  STEP 2: LOAD IMAGES (IMPORTANT)
          this.upis.forEach((upi: any) => {
            if (!upi.imagePath) return;

            //  smart handling (public vs private)
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

  // ---------- PORTALS LOADING ----------
  // loadPortals(agentId: string) {
  //   if (!agentId) return;
  //   this.headService
  //       .getAllHeadsWithPortalsById(agentId, "UPI")
  //       .pipe(catchError(() => of([])))
  //       .subscribe((res: any) => {
  //         let list: any[] = [];
  //         if (Array.isArray(res)) list = res;
  //         else if (res?.data) list = res.data;
  //         else if (res) list = [res];

  //         this.portals = list.map((item) => ({
  //           id: item.id || item._id || "",
  //           portalId: item.portalId || item.portalID || item.portal_id || "",
  //           domain:
  //               item.portalDomain ||
  //               item.domain ||
  //               item.domainName ||
  //               "Untitled Portal",
  //           currency: item.currency || "INR",
  //         }));

  //         this.filteredPortals = [...this.portals];
  //         this.upiFilteredPortals = [];
  //       });
  // }

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
    this.maxLimit = null; //  NEW: reset max limit
    this.transactionMinAmount = null;
    this.transactionMaxAmount = null;
    this.showPortalDropdown = false;
    this.currentPage = 1;
    this.fetchUpis();
  }

  // ---------- PORTAL FILTER DROPDOWN ----------
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

  // ---------- ADD MODAL PORTAL SEARCH ----------
  // onUpiPortalSearch(): void {
  //   const term = (this.upiPortalSearch || "").trim().toLowerCase();
  //   this.upiFilteredPortals = term
  //     ? this.portals.filter(
  //         (site) =>
  //           site.domain.toLowerCase().includes(term) ||
  //           (site.currency && site.currency.toLowerCase().includes(term)),
  //       )
  //     : [];
  // }

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

  // selectUpiPortal(site: any): void {
  //   this.selectedUpiPortal = site;
  //   this.addUpiForm.patchValue({ portalId: site.id });
  //   this.addUpiForm.get("portalId")?.markAsTouched();
  //   this.upiPortalSearch = site.domain;
  //   this.upiFilteredPortals = [];
  // }
  selectUpiPortal(site: any): void {
    this.selectedUpiPortal = site;

    this.addUpiForm.patchValue({
      portalId: site.id,
    });

    this.addUpiForm.get("portalId")?.markAsTouched();

    this.upiPortalSearch = site.domain;

    this.upiFilteredPortals = [];
    this.showUpiPortalDropdown = false;
  }

  // clearUpiPortalSelection(): void {
  //   this.selectedUpiPortal = null;
  //   this.upiPortalSearch = "";
  //   this.upiFilteredPortals = [];
  //   this.addUpiForm.patchValue({ portalId: "" });
  //   this.addUpiForm.get("portalId")?.markAsTouched();
  // }
  clearUpiPortalSelection(): void {
    this.selectedUpiPortal = null;
    this.upiPortalSearch = "";
    this.upiFilteredPortals = [];

    //  Form se portalId clear karo
    this.addUpiForm.patchValue({ portalId: "" });
    this.addUpiForm.get("portalId")?.markAsTouched();
    this.addUpiForm.get("portalId")?.updateValueAndValidity();
  }

  // ---------- PAGINATION ----------
  totalPages(): number {
    return this.totalPagesCount;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();

    const prev = this.currentPage - 1;
    const next = this.currentPage + 1;

    if (prev >= 1) {
      pages.push(prev);
    }

    pages.push(this.currentPage);

    if (next <= total) {
      pages.push(next);
    }

    return pages;
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
        upi.status = upi.status === "active" ? "inactive" : "active";
        this.snack.show(
          err?.error?.message || "Failed to update status.",
          false,
        );
      },
    });
  }

  // ---------- ADD MODAL ----------
  openAddModal(): void {
    // if (!this.portals?.length) this.loadPortals(this.currentRoleId);
    this.selectedUpiPortal = null;
    this.upiPortalSearch = "";
    this.upiFilteredPortals = [];
    this.showAddModal = true;
    document.body.style.overflow = "hidden";
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addUpiForm.reset();
    this.qrData = null;
    this.generatedFile = null;
    this.isAddingUpi = false;
    this.selectedUpiPortal = null;
    this.upiPortalSearch = "";
    this.upiFilteredPortals = [];
    this.capacityRanges = [{ minRange: null, maxRange: null, quantity: null }];
    document.body.style.overflow = "auto";
    this.selectedImage = null;
    this.manualQrFile = null;
  }

  submitAddUpi(): void {
    Object.keys(this.addUpiForm.controls).forEach((key) =>
      this.addUpiForm.get(key)?.markAsTouched(),
    );

    if (this.addUpiForm.invalid) {
      this.snack.show("Please fill all required fields correctly.", false);
      return;
    }

    // if (!this.generatedFile) {
    //   this.snack.show("Please generate QR code first.", false);

    //   return;
    // }
    if (!this.generatedFile && !this.manualQrFile) {
      this.snack.show("Please upload or generate QR code.", false);
      return;
    }

    // const selectedPortal = this.portals.find(
    //   (site) => String(site.id) === String(this.addUpiForm.value.portalId),
    // );
    const selectedPortal = this.portals?.[0];
    // if (!selectedPortal) {
    //   this.snack.show("Selected portal not found.", false);
    //   return;
    // }
    // if (this.addUpiForm.value.minAmount === 0) {
    // }

    if (!this.generatedFile) {
      this.snack.show("Please generate QR code first.", false);
      return;
    }
    // const validRanges = this.capacityRanges.filter(
    //   (r) =>
    //     r.minRange != null &&
    //     r.maxRange != null &&
    //     r.quantity != null &&
    //     r.minRange > 0 &&
    //     r.maxRange > 0 &&
    //     r.quantity > 0,
    // );
    const validRanges = this.capacityRanges;

    const payload = {
      // portal: selectedPortal.portalId,
      // portalId: selectedPortal.id,
      vpa: this.addUpiForm.value.vpa,
      limitAmount: this.addUpiForm.value.limitAmount,
      // agent_id: this.currentRoleId,
      entityId: this.currentRoleId,
      entityType: this.role,

      bankId: "5974d3e0-0de0-494e-8a1b-acd4ce6d1dfe",
      userId: this.userId,
      active: true,
      minTranCount: Number(this.addUpiForm.value.min_tran_count) || 0,
      maxTranCount: Number(this.addUpiForm.value.max_tran_count) || 0,
      minTotalTranAmount:
        Number(this.addUpiForm.value.min_total_tran_amount) || 0,
      maxTotalTranAmount:
        Number(this.addUpiForm.value.max_total_tran_amount) || 0,
      createdAt: new Date().toISOString(),
      // ranges: validRanges.map((r) => ({
      //   minRange: Number(r.minRange),
      //   maxRange: Number(r.maxRange),
      //   quantity: Number(r.quantity), // User ne jo quantity di hai wahi bhejo
      // })),

      ranges: validRanges.map((r) => ({
        minRange: r.minRange ?? null,
        maxRange: r.maxRange ?? null,
        quantity: r.quantity ?? null,
      })),
    };

    const formData = new FormData();
    const dtoBlob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    formData.append("dto", dtoBlob);
    formData.append("file", this.generatedFile, this.generatedFile.name);

    // if (this.currentRoleId) formData.append("agent_id", this.currentRoleId);
    // if (this.currentRoleId) formData.append("branchId", this.currentRoleId);
    // if (this.userId) formData.append("userId", this.userId);

    this.isAddingUpi = true;

    this.upiService.add(formData).subscribe({
      next: (response: any) => {
        this.isAddingUpi = false;
        if (response.success || response.id || response._id) {
          this.snack.show("UPI added successfully!", true);
          this.closeAddModal();
          this.fetchUpis(); //  refresh list
        } else {
          this.snack.show(response.message || "Failed to add UPI.", false);
        }
      },
      error: (error: any) => {
        this.isAddingUpi = false;

        const errorMsg =
          error?.error?.message || error?.error?.error || "Failed to add UPI";
        this.snack.show(
          errorMsg ||
            "Failed to add UPI. Please check your connection and try again.",
          false,
        );
      },
    });
  }

  // openUpdateModal(upi: any): void {
  //   this.editingUpi = upi;
  //   this.updateForm = {
  //     vpa: upi.vpa || "",
  //     limitAmount: upi.limitAmount || "",
  //     status: upi.status || "active",
  //     maxAmount: upi.maxAmount || "",
  //     minAmount: upi.minAmount || "",
  //   };

  //   // //  Validation for minAmount (allow 0)
  //   // if (this.updateForm.minAmount < 0) {
  //   //   this.snack.show("Min amount cannot be negative", false);
  //   //   return;
  //   // }

  //   // //  Check if min > max
  //   // if (this.updateForm.minAmount > this.updateForm.maxAmount) {
  //   //   this.snack.show("Min amount cannot be greater than Max amount", false);
  //   //   return;
  //   // }

  //   this.originalVpa = (upi.vpa || "").trim().toLowerCase();
  //   this.vpaChanged = false;
  //   this.newQrGenerated = false;
  //   this.updateQrData = null;
  //   this.generatedUpdateFile = null;
  //   this.updateQrError = "";
  //   this.showUpdateModal = true;
  //   document.body.style.overflow = "hidden";
  // }

  openUpdateModal(upi: any): void {
    this.editingUpi = upi;

    this.updateForm = {
      vpa: upi.vpa || "",
      limitAmount: upi.limitAmount || "",
      status: upi.status || "active",
      maxAmount: upi.maxAmount || "",
      minAmount: upi.minAmount || "",

      min_tran_count: upi.min_tran_count ?? null,
      max_tran_count: upi.max_tran_count ?? null,
      min_total_tran_amount: upi.min_total_tran_amount ?? null,
      max_total_tran_amount: upi.max_total_tran_amount ?? null,
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

  // onUpdateVpaChange(): void {
  //   if (this.isValidUpiId(this.updateForm.vpa)) {
  //     this.updateQrError = "";
  //   }
  //   this.removeGeneratedUpdateQr();
  // }

  onUpdateVpaChange(): void {
    const currentVpa = (this.updateForm.vpa || "").trim().toLowerCase(); //  lowercase
    const original = this.originalVpa;
    this.vpaChanged = currentVpa !== original;

    // Agar VPA badal gaya, to QR reset karo
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

    // const minAmount =
    //   this.updateForm.minAmount !== "" && this.updateForm.minAmount != null
    //     ? String(this.updateForm.minAmount)
    //     : this.editingUpi.minAmount;
    // const maxAmount =
    //   this.updateForm.maxAmount !== "" && this.updateForm.maxAmount != null
    //     ? String(this.updateForm.maxAmount)
    //     : this.editingUpi.maxAmount;
    const statusBool = this.updateForm.status === "active";

    const dtoPayload: any = {
      id: this.editingUpi.id || this.editingUpi.qrId,
      portal: this.editingUpi.portal,
      entityId: this.currentRoleId,
      entityType: this.role,
      vpa: vpa,
      limitAmount: limit.toString(),
      active: statusBool,
      // minAmount,
      // maxAmount,
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
        this.fetchUpis(); //  refresh
        this.snack.show("UPI updated successfully!", true);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.snack.show("Error updating UPI. Please try again.", false);
      },
    });
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
                this.newQrGenerated = true; //  flag set
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

  // @HostListener("document:click", ["$event"])
  // onDocumentClick(event: MouseEvent): void {
  //   const target = event.target as HTMLElement;

  //   // Close portal dropdown
  //   const portalContainer = target.closest(".portal-filter-container");
  //   if (!portalContainer && this.showPortalDropdown) {
  //     this.showPortalDropdown = false;
  //   }

  //   // Close action dropdown
  //   const actionDropdown = target.closest(".relative");
  //   if (!actionDropdown) {
  //     this.activeDropdownUpiId = null;
  //   }

  //   const upiContainer = target.closest(".upi-portal-container");
  //   if (!upiContainer) {
  //     this.showUpiPortalDropdown = false;
  //   }
  // }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest(".portal-filter-container")) {
      this.showPortalDropdown = false;
    }

    if (!target.closest(".action-dropdown-wrapper")) {
      this.activeDropdownUpiId = null;
    }

    if (!target.closest(".upi-portal-container")) {
      this.showUpiPortalDropdown = false;
    }

    if (!target.closest(".payment-dropdown-wrapper")) {
      this.showPaymentDropdown = false;
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

    this.router.navigate(["../", type], {
      relativeTo: this.route,
    });
  }

  // Add this new method for focus event
  onUpiPortalFocus(): void {
    if (this.portals.length > 0 && !this.showUpiPortalDropdown) {
      this.showUpiPortalDropdown = true;
      this.onUpiPortalSearch(); // refresh filtered list
    }
  }

  //    submitLimitTime() {
  //   if (!this.limitDateTime || !this.editingUpi) return;

  //   const selectedTime = new Date(this.limitDateTime).getTime();
  //   const nowTime = new Date().getTime();

  //   if (selectedTime < nowTime) {
  //     this.snack.show("Please select a future date and time", false);
  //     return;
  //   }

  //   this.isSubmittingLimit = true;

  //   const payload = {
  //     dateTime: this.limitDateTime,
  //   };

  //   const id = this.editingUpi.id;

  //   this.upiService.setLimitTime(id, payload).subscribe({
  //     next: () => {
  //       this.snack.show("Limit time set successfully", true);
  //       this.closeLimitModal();
  //       this.isSubmittingLimit = false;
  //     },
  //     error: () => {
  //       this.snack.show("Failed to set limit time", false);
  //       this.isSubmittingLimit = false;
  //     },
  //   });

  // }

  updateFrom(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].minRange = isNaN(value) ? null : value;
  }

  updateTo(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].maxRange = isNaN(value) ? null : value;

    // this.recalculateRanges();
  }
  updateQuantity(index: number, event: any) {
    const value = Number(event.target.value);
    this.capacityRanges[index].quantity = isNaN(value) ? null : value;
  }

  addRange() {
    const last = this.capacityRanges[this.capacityRanges.length - 1];

    // this.capacityRanges.push({
    //   minRange: last?.maxRange || null,
    //   maxRange: null,
    //   quantity: null,
    // });

    this.capacityRanges.push({
      minRange: null,
      maxRange: null,
      quantity: null,
    });
  }

  removeRange(index: number) {
    this.capacityRanges.splice(index, 1);
    // this.recalculateRanges();
  }

  recalculateRanges() {
    // for (let i = 1; i < this.capacityRanges.length; i++) {
    //   const prev = this.capacityRanges[i - 1];
    //   const current = this.capacityRanges[i];
    //   if (prev?.maxRange != null) {
    //     current.minRange = prev.maxRange;
    //   }
    // }
  }

  selectedId!: string;
  selectedPortalId!: string;
  selectedTopupId!: string;
  selectedMode!: "UPI" | "BANK";

  openCapacity(item: any, mode: "UPI" | "BANK") {
    this.selectedId = item.id;

    this.selectedPortalId = item.portalId || item.portal || item.portalID;

    this.selectedTopupId = item.topupId || item.id || item.qrId;

    this.selectedMode = mode;

    console.log(" FINAL PASS:", {
      entityId: this.selectedId,
      portalId: this.selectedPortalId,
      topupId: this.selectedTopupId,
    });

    this.showCapacityModal = true;
  }

  //toggle upi status

  isToggleConfirmVisible = false;
  toggleCandidateUpi: any = null;

  // Click handler
  openUpiToggleConfirm(upi: any, event: Event) {
    event.preventDefault(); //  prevent immediate toggle
    this.toggleCandidateUpi = upi;
    this.isToggleConfirmVisible = true;
  }

  closeUpiToggleConfirm() {
    this.isToggleConfirmVisible = false;
    this.toggleCandidateUpi = null;
  }

  // Backend call + UI update
  executeUpiToggle() {
    if (!this.toggleCandidateUpi) return;

    this.upiService.toggleIsUpi(this.toggleCandidateUpi.id).subscribe({
      next: () => {
        //  Only update UI after backend success
        this.toggleCandidateUpi.isUpiActive =
          !this.toggleCandidateUpi.isUpiActive;

        this.isToggleConfirmVisible = false;
        this.toggleCandidateUpi = null;
      },
      error: (err: any) => {
        this.isToggleConfirmVisible = false;
      },
    });
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

    // preview
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
    };
    reader.readAsDataURL(file);

    // IMPORTANT: override generated QR
    this.generatedFile = file;
  }

  // onUpdateQrFileSelected(event: any): void {
  //   const file = event.target.files[0];
  //   if (!file) return;

  //   this.updateManualQrFile = file;

  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     this.updateSelectedImage = reader.result as string;
  //   };
  //   reader.readAsDataURL(file);

  //   this.generatedUpdateFile = file;
  //   this.newQrGenerated = true;
  // }
  onUpdateQrFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 500 * 1024; // 500KB

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

    // reset everything when switching
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

  private getTopupStatus() {
    this.headService.getHeadById(this.currentRoleId).subscribe((res) => {
      this.topupStatus = res.topup;
    });
  }
  changeTopupStatus() {
    this.headService.toggleDashbaordTopup(this.currentRoleId).subscribe(() => {
      this.topupStatus = !this.topupStatus;
    });
  }

  loadBanks() {
    this.bankServices
      .getBankDataWithSubAdminIdAndActivePaginated(this.currentRoleId, {
        page: 0,
        size: 100,
        active: true,
      })
      .subscribe((res: any) => {
        const data = res.data?.content || [];

        this.banks = data;
        this.filteredBanks = [...this.banks];

        //  CASE 1: bankId exists → auto select
        // if (this.preselectedBankId) {
        //   const matchedBank = this.banks.find(
        //     (b) => b.id === this.preselectedBankId
        //   );

        //   if (matchedBank) {
        //     this.selectedBank = matchedBank;
        //     this.bankSearchTerm = matchedBank.accountHolderName;

        //     this.fetchUpis(); //  filtered
        //     return;
        //   }
        // }

        //  CASE 2: NO bankId → fetch ALL
        // this.fetchUpis();
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

    this.onFilterChange(); //  trigger API
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

 isLive(upi: any): boolean {
  return !!(
    this.topupStatus &&     // Topup toggle ON
    upi.isUpiActive &&      // Toggle ON
    upi.status === 'active' // Status active
  );
}
  showTxnModal = false;
  selectedTxnData: any = null;

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
}
