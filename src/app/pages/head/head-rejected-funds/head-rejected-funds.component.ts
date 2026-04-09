
import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { of, Subscription } from "rxjs";
import { catchError } from "rxjs/operators";
import { FundsService } from "../../services/funds.service";
import { UserStateService } from "../../../store/user-state.service";
import { fileBaseUrl } from "../../services/helper";
import { HeadService } from "../../services/head.service";
import { DateTimeUtil } from "../../../utils/date-time.utils";
import { MultimediaService } from "../../services/multimedia.service";
@Component({
  selector: "app-head-rejected-funds",
  templateUrl: "./head-rejected-funds.component.html",
  styleUrls: ["./head-rejected-funds.component.css"],
})
export class HeadRejectedFundsComponent implements OnInit, OnDestroy {
  // Arrays for each type (server returns paginated data)
  upitopups: any[] = [];
  banktopups: any[] = [];
  approvedpayouts: any[] = [];

  // Pagination metadata from server
  upiTotalRecords = 0;
  bankTotalRecords = 0;
  payoutTotalRecords = 0;

  // route + user ids
  branchId: string | null = null;
  userId: string | null = null;
  role: string | null = "";

  private routeSub: Subscription | null = null;

  // active view
  activeView: "upi" | "bank" | "payout" = "upi";
imageError=false
  // ========== FILTER PROPERTIES ==========
  // UPI filters
  upiSearchQuery = "";
  upiPortalFilter = "";
  upiDateFrom = "";
  upiDateTo = "";
  upiPortals: any[] = [];

  // Bank filters
  bankSearchQuery = "";
  bankPortalFilter = "";
  bankDateFrom = "";
  bankDateTo = "";
  bankPortals: any[] = [];

  allUpiTopups: any[] = [];
  allBankTopups: any[] = [];
  allRejectedPayouts: any[] = [];
  // Payout filters
  payoutSearchQuery = "";
  payoutPortalFilter = "";
  payoutDateFrom = "";
  payoutDateTo = "";
  payoutPortals: any[] = [];

  // ========== PAGINATION (client‑side) ==========
  upiPage = 0;
  upiPageSize = 10;
  upiPageSizes = [10, 20, 25, 50];

  bankPage = 0;
  bankPageSize = 10;
  bankPageSizes = [10, 20, 25, 50];

  payoutApprovedPage = 0;
  payoutApprovedPageSize = 10;
  payoutApprovedPageSizes = [10, 20, 25, 50];
portalOptions: { id: string; domain: string }[] = [];
  // ========== FILTER DROPDOWN STATE ==========
  filterDropdownOpen: string | null = null; // 'upi' | 'bank' | 'payout' | null

  // ========== CUSTOM PORTAL DROPDOWN STATE ==========
  upiPortalDropdownOpen = false;
  bankPortalDropdownOpen = false;
  payoutPortalDropdownOpen = false;

  // ========== MODAL & LIGHTBOX STATE ==========
  showRecordModal = false;
  selectedRecord: any = null;
  lightboxImage: string | null = null;

  // Colors based on role (already in template via data-role)
  colors: any = null;
  headPortals: any[] = [];
  constructor(
    private route: ActivatedRoute,
    private fundService: FundsService,
    private userStateService: UserStateService,
    private headServices: HeadService,
    private multimediaService: MultimediaService 
  ) {}

  ngOnInit(): void {
    this.branchId = this.userStateService.getCurrentEntityId();
    this.userId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();
    this.setColorsByRole();
    this.loadAllPortals();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const type = params.get("type") as "upi" | "bank" | "payout" | null;
      this.activeView = type === "bank" || type === "payout" ? type : "upi";

      if (!this.branchId) return;

      // // Fetch data for the current view (server‑side pagination)
      // if (this.activeView === "upi") {
      //   this.fetchUpiTopups();
      //   this.fetchUpiPortals(); // populate portal dropdown
      // } else if (this.activeView === "bank") {
      //   this.fetchBankTopups();
      //   this.fetchBankPortals();
      // } else {
      //   this.fetchApprovedPayouts();
      //   this.fetchPayoutPortals();
      // }

      if (this.activeView === "upi") {

        if (this.upiPortalFilter){
          this.fetchAllUpiTopups();
        }
        // this.fetchAllUpiTopups();
      } else if (this.activeView === "bank") {
        // this.fetchAllBankTopups();
        if (this.bankPortalFilter){
          this.fetchAllBankTopups();
        }
      } else {
          if (this.payoutPortalFilter){
          this.fetchAllRejectedPayouts();
        }
        // this.fetchAllRejectedPayouts();
      }
    });
  }

  // loadAllPortals(): void {
  //   if (!this.branchId) return;

  //   this.headServices
  //     .getAllHeadsWithPortalsById(this.branchId)
  //     .pipe(
  //       catchError((err) => {
  //         this.headPortals = [];
  //         this.upiPortals = [];
  //         this.bankPortals = [];
  //         this.payoutPortals = [];
  //         return of([]);
  //       }),
  //     )
  //     .subscribe((response: any) => {
  //       const portalsData = Array.isArray(response?.data)
  //         ? response.data
  //         : Array.isArray(response)
  //           ? response
  //           : [];

  //       this.headPortals = portalsData;

  //       const portals = [
  //         ...new Set(
  //           portalsData
  //             .map((item: any) => item.portalId)
  //             .filter((site: string) => !!site?.trim()),
  //         ),
  //       ];

  //       this.upiPortals = portals;
  //       this.bankPortals = portals;
  //       this.payoutPortals = portals;
  //     });
  // }
  loadAllPortals(): void {
  if (!this.branchId) return;

  this.headServices
    .getAllHeadsWithPortalsById(this.branchId)
    .pipe(
      catchError((err) => {
        this.portalOptions = [];
        this.upiPortals = [];
        this.bankPortals = [];
        this.payoutPortals = [];
        return of([]);
      }),
    )
    .subscribe((response: any) => {
      const portalsData = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      // ✅ Create object with id + domain
      const uniqueMap = new Map<string, any>();

      portalsData.forEach((item: any) => {
        if (item?.portalId && item?.portalDomain) {
          uniqueMap.set(item.portalId, {
            id: item.portalId,
            domain: item.portalDomain,
          });
        }
      });

      const portals = Array.from(uniqueMap.values());

      // ✅ MAIN VARIABLE (use this in HTML)
      this.portalOptions = portals;

      // ✅ Filters store only ID
      this.upiPortals = portals;
      this.bankPortals = portals;
      this.payoutPortals = portals;
    });
}
formatDateWithFixedTime(dateStr: string, type: 'start' | 'end'): string {
  const date = new Date(dateStr);

  if (type === 'start') {
    // 00:00:00 IST
    date.setHours(0, 0, 0, 0);
  } else {
    // 23:59:59 IST
    date.setHours(23, 59, 59, 999);
  }

  return date.toISOString(); // converts to UTC (your required format)
}



  fetchAllUpiTopups(): void {
    if (!this.branchId) return;
    const pageSize = 100;
    let page = 0;
    const allData: any[] = [];

    const fetchPage = () => {
      // this.fundService
      //   .getAllUpiFundWithEntityAndPortalId(
      //     this.branchId,
      //     this.upiPortalFilter,
      //     "REJECTED",
      //     page,
      //     pageSize,
         
      //   )
      const fromDate = this.upiDateFrom
  ? DateTimeUtil.toUtcISOString(
      new Date(new Date(this.upiDateFrom).setHours(0, 0, 0, 0))
    )
  : null;

const toDate = this.upiDateTo
  ? DateTimeUtil.toUtcISOString(
      new Date(new Date(this.upiDateTo).setHours(23, 59, 59, 999))
    )
  : null;
      this.fundService.getAllUpiFundWithEntityAndPortalId(
  this.branchId,
  this.upiPortalFilter,
  "REJECTED",
  page,
  pageSize,
  "undefined",
  fromDate || undefined ,
toDate || undefined 
)
        .pipe(
          catchError((err) => {
            return of({ data: [], total: 0 });
          }),
        )
        .subscribe((response: any) => {
          const list = this.extractListFromResponse(response);
          allData.push(...list);
          const total = this.extractTotalFromResponse(response);

          if ((page + 1) * pageSize < total) {
            page++;
            fetchPage();
          } else {
            this.allUpiTopups = allData;
            this.mapUpiArray(allData);
            this.upiTotalRecords = allData.length;
            // this.upiPortals = [
            //   ...new Set(
            //     allData
            //       .map((t) => t.portalDomain || t.portalId)
            //       .filter(Boolean),
            //   ),
            // ];

            this.headServices
              .getAllHeadsWithPortalsById(this.branchId)
              .subscribe({
                next: (res: any) => {},
              });
          }
        });
    };
    fetchPage();
  }

  fetchAllBankTopups(): void {
    if (!this.branchId) return;
    const pageSize = 100;
    let page = 0;
    const allData: any[] = [];

    const fetchPage = () => {
      // this.fundService
      //   .getAllBankFundWithEntityAndPortalId(
      //     this.branchId,
      //     this.bankPortalFilter,
      //     "REJECTED",
      //     page,
      //     pageSize,
       
      //   )

           const fromDate = this.bankDateFrom
  ? DateTimeUtil.toUtcISOString(
      new Date(new Date(this.bankDateFrom).setHours(0, 0, 0, 0))
    )
  : null;

const toDate = this.bankDateTo
  ? DateTimeUtil.toUtcISOString(
      new Date(new Date(this.bankDateTo).setHours(23, 59, 59, 999))
    )
  : null; 

      this.fundService.getAllBankFundWithEntityAndPortalId(
  this.branchId,
  this.bankPortalFilter,
  "REJECTED",
  page,
  pageSize,
  undefined,
fromDate || undefined ,
  toDate || undefined 
)
        .pipe(
          catchError((err) => {
            return of({ data: [], total: 0 });
          }),
        )
        .subscribe((response: any) => {
          const list = this.extractListFromResponse(response);
          allData.push(...list);
          const total = this.extractTotalFromResponse(response);

          if ((page + 1) * pageSize < total) {
            page++;
            fetchPage();
          } else {
            this.allBankTopups = allData;
            this.mapBankArray(allData);
            this.bankTotalRecords = allData.length;
            // this.bankPortals = [
            //   ...new Set(
            //     allData
            //       .map((t) => t.portalDomain || t.portalId)
            //       .filter(Boolean),
            //   ),
            // ];
          }
        });
    };
    fetchPage();
  }

  fetchAllRejectedPayouts(): void {
    if (!this.branchId) return;
    const pageSize = 100;
    let page = 0;
    const allData: any[] = [];

    const fetchPage = () => {
      // this.fundService
      //   .getAllPayoutFundWithEntityAndPortalId(
      //     this.branchId,
      //     this.payoutPortalFilter,
      //     "REJECTED",
      //     page,
      //     pageSize,
 
      //   )
      
           const fromDate = this.payoutDateFrom
  ? DateTimeUtil.toUtcISOString(
      new Date(new Date(this.payoutDateFrom).setHours(0, 0, 0, 0))
    )
  : " ";

const toDate = this.payoutDateTo
  ? DateTimeUtil.toUtcISOString(
      new Date(new Date(this.payoutDateTo).setHours(23, 59, 59, 999))
    )
  : null;
      this.fundService.getAllPayoutFundWithEntityAndPortalId(
  this.branchId,
  this.payoutPortalFilter,
  "REJECTED",
  page,
  pageSize,
  undefined,
 fromDate || undefined ,
  toDate || undefined 
)
        .pipe(
          catchError((err) => {
            return of({ data: [], total: 0 });
          }),
        )
        .subscribe((response: any) => {
          const list = this.extractListFromResponse(response);
          allData.push(...list);
          const total = this.extractTotalFromResponse(response);

          if ((page + 1) * pageSize < total) {
            page++;
            fetchPage();
          } else {
            this.allRejectedPayouts = allData;
            this.mapPayoutArray(allData);
            this.payoutTotalRecords = allData.length;
            // this.payoutPortals = [
            //   ...new Set(allData.map((p) => p.portalDomain).filter(Boolean)),
            // ];
          }
        });
    };
    fetchPage();
  }
  private mapBankArray(items: any[]) {
    this.banktopups = items.map((it: any) => ({
      mode: "bank",
      portal: it.portalDomain || it.domain || it.site || it.merchant,
      portalId: it.portalId || it.siteId,
      accountNo: it.accountNo || it.accNo || it.account,
      transactionId: it.transactionId || it.txnId,
      amount: Number(it.amount ?? it.value ?? 0),
      settled: it.settled,
      holder: it.bankAccountHolderName,
      reviewStatus: it.reviewStatus || it.review,
      status: it.status || it.state,
      queryText: it.queryText,
      date: it.createdAt
        ? new Date(it.createdAt)
        : it.date
          ? new Date(it.date)
          : new Date(),
      raw: it,
    }));
    this.banktopups.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );
  }

  private mapUpiArray(items: any[]) {
    this.upitopups = items.map((it: any) => ({
      mode: "upi",
      portal: it.portalDomain || it.domain || it.site || it.merchant,
      portalId: it.portalId || it.siteId,
      vpa: it.vpa || it.vpaId || it.upiId,
      upiId: it.upiId,
      accountNo: it.accountNo || it.accNo || it.account,
      transactionId: it.transactionId || it.txnId,
      amount: Number(it.amount ?? it.value ?? 0),
      settled: it.settled,
      reviewStatus: it.reviewStatus || it.review,
      status: it.status || it.state,
      queryText: it.queryText,
      date: it.createdAt
        ? new Date(it.createdAt)
        : it.date
          ? new Date(it.date)
          : new Date(),
      raw: it,
    }));
    this.upitopups.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );
  }

  // Helper to extract list from various response shapes
  private extractListFromResponse(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.data) {
      if (Array.isArray(response.data)) return response.data;
      if (response.data.content) return response.data.content;
    }
    if (response?.content) return response.content;
    return [];
  }

  private extractTotalFromResponse(response: any): number {
    if (response?.total) return response.total;
    if (response?.data?.totalElements) return response.data.totalElements;
    if (response?.totalElements) return response.totalElements;
    return 0;
  }

  setColorsByRole() {
    const head = {
      primary: "#E67A00",
      secondary: "#FFB366",
      bg: "#FFF9F2",
      font: "#1F2937",
      border: "#CC6A00",
      hover: "#FF8A1A",
      glow: "rgba(230,122,0,0.50)",
    };
    const branch = {
      primary: "#FFC61A",
      secondary: "#FFE699",
      bg: "#FFFDF2",
      font: "#1F2937",
      border: "#E6B800",
      hover: "#FFD54F",
      glow: "rgba(255,198,26,0.50)",
    };

    if (!this.role) {
      this.colors = branch;
      return;
    }

    const low = String(this.role).toLowerCase();
    if (low.includes("head")) {
      this.colors = head;
    } else if (low.includes("branch")) {
      this.colors = branch;
    } else {
      this.colors = branch;
    }
  }

  // ============ FETCH PORTALS (for dropdowns) ============
  fetchUpiPortals(): void {
    // Implement a service call to get distinct portals for UPI topups
    // For now, we'll keep the existing upiPortals array (populated from previous data)
    // You can call a dedicated endpoint if available.
  }

  fetchBankPortals(): void {
    // similar
  }

  fetchPayoutPortals(): void {
    // similar
  }

  // ============ FETCH DATA (server‑side paginated) ============
  fetchUpiTopups(): void {
    if (!this.branchId) return;

    this.fundService
      .getAllUpiFundWithBranchIdPaginated(
        this.branchId,
        "REJECTED", // changed from ACCEPTED to REJECTED
        this.upiPage,
        this.upiPageSize,
        this.upiSearchQuery,
      )
      .pipe(
        catchError((err) => {
          return of({ data: [], total: 0 });
        }),
      )
      .subscribe((response: any) => {
        const { list, total, pageNum, pageSize } = this.parseResponse(response);
        this.upiTotalRecords = total;
        this.upiPage = pageNum;
        this.upiPageSize = pageSize;
        this.mapFundsArray(list, "upi");
      });
  }

  fetchBankTopups(): void {
    if (!this.branchId) return;

    this.fundService
      .getAllBankFundWithBranchIdPaginated(
        this.branchId,
        "REJECTED", // changed from ACCEPTED to REJECTED
        this.bankPage,
        this.bankPageSize,
        this.bankSearchQuery,
      )
      .pipe(
        catchError((err) => {
          return of({ data: [], total: 0 });
        }),
      )
      .subscribe((response: any) => {
        const { list, total, pageNum, pageSize } = this.parseResponse(response);
        this.bankTotalRecords = total;
        this.bankPage = pageNum;
        this.bankPageSize = pageSize;
        this.mapFundsArray(list, "bank");
      });
  }

  fetchApprovedPayouts(): void {
    if (!this.branchId) return;

    this.fundService
      .getAllpayoutTrueFalseBybranchIdPaginate(
        this.branchId,
        "REJECTED", // changed from ACCEPTED to REJECTED
        this.payoutApprovedPage,
        this.payoutApprovedPageSize,
        this.payoutSearchQuery,
      )
      .pipe(
        catchError((err) => {
          return of({ data: [], total: 0 });
        }),
      )
      .subscribe((response: any) => {
        const { list, total, pageNum, pageSize } = this.parseResponse(response);
        this.payoutTotalRecords = total;
        this.payoutApprovedPage = pageNum;
        this.payoutApprovedPageSize = pageSize;
        this.mapPayoutArray(list);
      });
  }

  // Helper to parse various response shapes
  private parseResponse(response: any): {
    list: any[];
    total: number;
    pageNum: number;
    pageSize: number;
  } {
    let list: any[] = [];
    let total = 0;
    let pageNum = 0;
    let pageSize = 10;

    if (Array.isArray(response)) {
      list = response;
      total = list.length;
    } else if (response?.data) {
      if (Array.isArray(response.data)) {
        list = response.data;
        total = response.total ?? list.length;
      } else if (Array.isArray(response.data.content)) {
        list = response.data.content;
        total =
          response.data.totalElements ?? response.data.total ?? list.length;
        pageNum = response.data.number ?? 0;
        pageSize = response.data.size ?? 10;
      }
    } else if (response?.content) {
      list = response.content;
      total = response.totalElements ?? response.total ?? list.length;
      pageNum = response.number ?? 0;
      pageSize = response.size ?? 10;
    }

    return { list, total, pageNum, pageSize };
  }

  // ============ MAPPERS ============
  private mapFundsArray(items: any[], mode: "bank" | "upi") {
    const targetArray = mode === "bank" ? this.banktopups : this.upitopups;
    targetArray.length = 0;

    items.forEach((it: any) => {
      const normalized = {
        mode: mode,
        portal: it.portalDomain || it.domain || it.site || it.merchant,
        portalId: it.portalId || it.siteId,
        vpa: it.vpa || it.vpaId || it.upiId,
        upiId: it.upiId,
        accountNo: it.accountNo || it.accNo || it.account,
        transactionId: it.transactionId || it.txnId,
        amount: Number(it.amount ?? it.value ?? 0),
        settled: it.settled,
        reviewStatus: it.reviewStatus || it.review,
        status: it.status || it.state,
        date: it.createdAt ? new Date(it.createdAt) : new Date(),
        raw: it,
        queryText: it.queryText,
      };
      targetArray.push(normalized);
    });

    targetArray.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );
  }

  private mapPayoutArray(items: any[]) {
    this.approvedpayouts = items.map((it: any) => ({
      mode: "payout",
      userId: it.userId,
      accountNo: it.accountNo || it.raw?.accountNo || it.accNo || "-",
      ifscCode: it.ifsc,
      holder: it.holder,
      amount: Number(it.currencyWiseAmount ?? it.amount ?? it.value ?? 0),
      status: it.status || it.state || "REJECTED", // default to REJECTED
      reviewStatus: it.reviewStatus,
      remarks: it.remarks,
      portalDomain: it.portalDomain,
      queryText: it.queryText,
      rejectionFilePath: it.rejectionFilePath,
      date: it.dateTime
        ? new Date(it.dateTime)
        : it.createdAt
          ? new Date(it.createdAt)
          : new Date(),
      raw: it.raw || it,
    }));
    this.approvedpayouts.sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
    );
  }

  // ============ TEMPLATE HELPERS ============
  filteredUpitopups(): any[] {
    return this.upitopups;
  }

  pagedUpitopups(): any[] {
    return this.upitopups; // server already paginated
  }

  upiTotalPages(): number {
    return Math.max(1, Math.ceil(this.upiTotalRecords / this.upiPageSize));
  }

  filteredBanktopups(): any[] {
    return this.banktopups;
  }

  pagedBanktopups(): any[] {
    return this.banktopups;
  }

  bankTotalPages(): number {
    return Math.max(1, Math.ceil(this.bankTotalRecords / this.bankPageSize));
  }

  filteredApprovedpayouts(): any[] {
    return this.approvedpayouts;
  }

  pagedApprovedpayouts(): any[] {
    return this.approvedpayouts;
  }

  payoutApprovedTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.payoutTotalRecords / this.payoutApprovedPageSize),
    );
  }

  // ============ PAGINATION CONTROLS ============
  setUpiPage(p: number) {
    const total = this.upiTotalPages();
    const newPage = Math.max(0, Math.min(p, total - 1));
    if (newPage !== this.upiPage) {
      this.upiPage = newPage;
      this.fetchUpiTopups();
    }
  }

  setBankPage(p: number) {
    const total = this.bankTotalPages();
    const newPage = Math.max(0, Math.min(p, total - 1));
    if (newPage !== this.bankPage) {
      this.bankPage = newPage;
      this.fetchBankTopups();
    }
  }

  setpayoutApprovedPage(p: number) {
    const total = this.payoutApprovedTotalPages();
    const newPage = Math.max(0, Math.min(p, total - 1));
    if (newPage !== this.payoutApprovedPage) {
      this.payoutApprovedPage = newPage;
      this.fetchApprovedPayouts();
    }
  }

  onChangeUpiPageSize(size: number) {
    this.upiPageSize = Number(size);
    this.upiPage = 0;
    this.fetchUpiTopups();
  }

  onChangeBankPageSize(size: number) {
    this.bankPageSize = Number(size);
    this.bankPage = 0;
    this.fetchBankTopups();
  }

  onChangepayoutApprovedPageSize(size: number) {
    this.payoutApprovedPageSize = Number(size);
    this.payoutApprovedPage = 0;
    this.fetchApprovedPayouts();
  }

  // ============ FILTER DROPDOWN CONTROLS ============
  toggleFilterDropdown(view: string) {
    if (this.filterDropdownOpen === view) {
      this.filterDropdownOpen = null;
    } else {
      this.filterDropdownOpen = view;
    }
  }

  get upiFilterActive(): boolean {
    return !!(this.upiDateFrom || this.upiDateTo);
  }

  get bankFilterActive(): boolean {
    return !!(this.bankDateFrom || this.bankDateTo);
  }

  get payoutFilterActive(): boolean {
    return !!(this.payoutDateFrom || this.payoutDateTo);
  }

  clearUpiDateFilters() {
    this.upiDateFrom = "";
    this.upiDateTo = "";
    this.applyUpiFilters();
  }

  clearBankDateFilters() {
    this.bankDateFrom = "";
    this.bankDateTo = "";
    this.applyBankFilters();
  }

  clearPayoutDateFilters() {
    this.payoutDateFrom = "";
    this.payoutDateTo = "";
    this.applyPayoutFilters();
  }

  // ============ PORTAL DROPDOWN CONTROLS ============
  togglePortalDropdown(view: "upi" | "bank" | "payout") {
    if (view === "upi") {
      this.upiPortalDropdownOpen = !this.upiPortalDropdownOpen;
      this.bankPortalDropdownOpen = false;
      this.payoutPortalDropdownOpen = false;
    } else if (view === "bank") {
      this.bankPortalDropdownOpen = !this.bankPortalDropdownOpen;
      this.upiPortalDropdownOpen = false;
      this.payoutPortalDropdownOpen = false;
    } else if (view === "payout") {
      this.payoutPortalDropdownOpen = !this.payoutPortalDropdownOpen;
      this.upiPortalDropdownOpen = false;
      this.bankPortalDropdownOpen = false;
    }
  }

  selectPortal(view: "upi" | "bank" | "payout", portal: any) {
    const portalId = portal?.id || "";
    
    if (view === "upi") {
      this.upiPortalFilter = portalId;
      this.upiPortalDropdownOpen = false;
      this.applyUpiFilters();
      this.fetchAllUpiTopups();
    } else if (view === "bank") {
      this.bankPortalFilter = portalId;
      this.bankPortalDropdownOpen = false;
      this.applyBankFilters();
      this.fetchAllBankTopups();
    } else if (view === "payout") {
      this.payoutPortalFilter = portalId;
      this.payoutPortalDropdownOpen = false;
      this.applyPayoutFilters();
       this.fetchAllRejectedPayouts();
    }
  }

  // ============ FILTER TRIGGERS ============
  // applyUpiFilters() {
  //   this.upiPage = 0;
  //   this.fetchUpiTopups();
  // }
  applyUpiFilters() {
    const search = this.upiSearchQuery.trim().toLowerCase();
    const portal = this.upiPortalFilter.trim().toLowerCase();
    const fromDate = this.upiDateFrom ? new Date(this.upiDateFrom) : null;
    const toDate = this.upiDateTo ? new Date(this.upiDateTo) : null;

    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    const filtered = this.allUpiTopups.filter((it: any) => {
      const itemDate = it.createdAt
        ? new Date(it.createdAt)
        : it.date
          ? new Date(it.date)
          : null;

      // const itemPortal = String(
      //   it.portalDomain || it.portalId || "",
      // ).toLowerCase();

      // const matchesPortal = !portal || itemPortal === portal;

      const portalId = this.upiPortalFilter.trim().toLowerCase();

const itemPortalId = String(it.portalId || "").toLowerCase();

const matchesPortal = !portalId || itemPortalId === portalId;

      const matchesSearch =
        !search ||
        String(it.vpa || it.upiId || "")
          .toLowerCase()
          .includes(search) ||
        String(it.transactionId || it.txnId || "")
          .toLowerCase()
          .includes(search) ||
        String(it.portalDomain || "")
          .toLowerCase()
          .includes(search) ||
        String(it.queryText || "")
          .toLowerCase()
          .includes(search);

      const matchesFrom = !fromDate || (itemDate && itemDate >= fromDate);
      const matchesTo = !toDate || (itemDate && itemDate <= toDate);

      return matchesPortal && matchesSearch && matchesFrom && matchesTo;
    });

    this.upiPage = 0;
    this.upiTotalRecords = filtered.length;
    this.mapUpiArray(filtered);
  }

  applyUpiFiltersAndClose() {
    this.applyUpiFilters();
    this.filterDropdownOpen = null;
  }

  // clearUpiFilters() {
  //   this.upiSearchQuery = "";
  //   this.upiPortalFilter = "";
  //   this.upiDateFrom = "";
  //   this.upiDateTo = "";
  //   this.upiPage = 0;
  //   this.fetchUpiTopups();
  //   this.filterDropdownOpen = null;
  // }

  // applyBankFilters() {
  //   this.bankPage = 0;
  //   this.fetchBankTopups();
  // }

  clearUpiFilters() {
    this.upiSearchQuery = "";
    this.upiPortalFilter = "";
    this.upiDateFrom = "";
    this.upiDateTo = "";
    this.upiPage = 0;
    this.upiTotalRecords = this.allUpiTopups.length;
    this.mapUpiArray(this.allUpiTopups);
    this.filterDropdownOpen = null;
  }
  applyBankFilters() {
  if (this.bankPortalFilter) {
    this.fetchAllBankTopups();
    return;
  }

    const search = this.bankSearchQuery.trim().toLowerCase();
    // const portal = this.bankPortalFilter.trim().toLowerCase();
    const fromDate = this.bankDateFrom ? new Date(this.bankDateFrom) : null;
    const toDate = this.bankDateTo ? new Date(this.bankDateTo) : null;

    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    const filtered = this.allBankTopups.filter((it: any) => {
      const itemDate = it.createdAt
        ? new Date(it.createdAt)
        : it.date
          ? new Date(it.date)
          : null;

      // const itemPortal = String(
      //   it.portalDomain || it.portalId || "",
      // ).toLowerCase();

      // const matchesPortal = !portal || itemPortal === portal;
      const portalId = this.bankPortalFilter.trim().toLowerCase();

const itemPortalId = String(it.portalId || "").toLowerCase();

const matchesPortal = !portalId || itemPortalId === portalId;

      const matchesSearch =
        !search ||
        String(it.accountNo || "")
          .toLowerCase()
          .includes(search) ||
        String(it.transactionId || it.txnId || "")
          .toLowerCase()
          .includes(search) ||
        String(it.portalDomain || "")
          .toLowerCase()
          .includes(search) ||
        String(it.bankAccountHolderName || "")
          .toLowerCase()
          .includes(search) ||
        String(it.queryText || "")
          .toLowerCase()
          .includes(search);

      const matchesFrom = !fromDate || (itemDate && itemDate >= fromDate);
      const matchesTo = !toDate || (itemDate && itemDate <= toDate);

      return matchesPortal && matchesSearch && matchesFrom && matchesTo;
    });

    this.bankPage = 0;
    this.bankTotalRecords = filtered.length;
    this.mapBankArray(filtered);
  }

  applyBankFiltersAndClose() {
    this.applyBankFilters();
    this.filterDropdownOpen = null;
  }

  // clearBankFilters() {
  //   this.bankSearchQuery = "";
  //   this.bankPortalFilter = "";
  //   this.bankDateFrom = "";
  //   this.bankDateTo = "";
  //   this.bankPage = 0;
  //   this.fetchBankTopups();
  //   this.filterDropdownOpen = null;
  // }

  // applyPayoutFilters() {
  //   this.payoutApprovedPage = 0;
  //   this.fetchApprovedPayouts();
  // }

  clearBankFilters() {
    this.bankSearchQuery = "";
    this.bankPortalFilter = "";
    this.bankDateFrom = "";
    this.bankDateTo = "";
    this.bankPage = 0;
    this.bankTotalRecords = this.allBankTopups.length;
    this.mapBankArray(this.allBankTopups);
    this.filterDropdownOpen = null;
  }
  applyPayoutFilters() {

      if (this.payoutPortalFilter) {
    this.fetchAllRejectedPayouts();
    return;
  }
    const search = this.payoutSearchQuery.trim().toLowerCase();
    const portal = this.payoutPortalFilter.trim().toLowerCase();
    const fromDate = this.payoutDateFrom ? new Date(this.payoutDateFrom) : null;
    const toDate = this.payoutDateTo ? new Date(this.payoutDateTo) : null;

    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    const filtered = this.allRejectedPayouts.filter((it: any) => {
      const itemDate = it.dateTime
        ? new Date(it.dateTime)
        : it.createdAt
          ? new Date(it.createdAt)
          : null;

      const itemPortal = String(it.portalDomain || "").toLowerCase();

      const matchesPortal = !portal || itemPortal === portal;

      const matchesSearch =
        !search ||
        String(it.accountNo || "")
          .toLowerCase()
          .includes(search) ||
        String(it.holder || "")
          .toLowerCase()
          .includes(search) ||
        String(it.portalDomain || "")
          .toLowerCase()
          .includes(search) ||
        String(it.queryText || "")
          .toLowerCase()
          .includes(search) ||
        String(it.remarks || "")
          .toLowerCase()
          .includes(search);

      const matchesFrom = !fromDate || (itemDate && itemDate >= fromDate);
      const matchesTo = !toDate || (itemDate && itemDate <= toDate);

      return matchesPortal && matchesSearch && matchesFrom && matchesTo;
    });

    this.payoutApprovedPage = 0;
    this.payoutTotalRecords = filtered.length;
    this.mapPayoutArray(filtered);
  }

  applyPayoutFiltersAndClose() {
    this.applyPayoutFilters();
    this.filterDropdownOpen = null;
  }

  // clearPayoutFilters() {
  //   this.payoutSearchQuery = "";
  //   this.payoutPortalFilter = "";
  //   this.payoutDateFrom = "";
  //   this.payoutDateTo = "";
  //   this.payoutApprovedPage = 0;
  //   this.fetchApprovedPayouts();
  //   this.filterDropdownOpen = null;
  // }
  clearPayoutFilters() {
    this.payoutSearchQuery = "";
    this.payoutPortalFilter = "";
    this.payoutDateFrom = "";
    this.payoutDateTo = "";
    this.payoutApprovedPage = 0;
    this.payoutTotalRecords = this.allRejectedPayouts.length;
    this.mapPayoutArray(this.allRejectedPayouts);
    this.filterDropdownOpen = null;
  }

  // ============ HOST LISTENER for outside click ============
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      target.closest(".date-filter-container") ||
      target.closest(".date-filter-button")
    ) {
      return;
    }
    this.filterDropdownOpen = null;
  }

  // ============ MODAL & LIGHTBOX ============
  openRecordModal(record: any) {
    this.selectedRecord = record;
    this.showRecordModal = true;
    this.loadImages(record);
  }

  closeRecordModal() {
    if (this.selectedRecord?.images) {
      this.selectedRecord.images.forEach((url: string) => {
        URL.revokeObjectURL(url); // 
      });
    }
    this.selectedRecord = null;
    this.showRecordModal = false;
    this.closeLightbox();

  }

  openLightbox(imageUrl: string | null) {
    if (imageUrl) {
      this.lightboxImage = imageUrl;
    }
  }

  closeLightbox() {
    this.lightboxImage = null;
  }

  @HostListener("document:keydown.escape", ["$event"])
  handleEscape(event: any) {
    if (this.lightboxImage) {
      this.closeLightbox();
    }
  }

  // ============ UI HELPERS ============
  formatCurrency(v: number) {
    if (v == null || isNaN(v)) return "0.00";
    return Number(v).toFixed(2);
  }

  getStatusClass(status: string): string {
    const st = (status || "").toLowerCase();
    if (st.includes("accept") || st.includes("completed") || st === "success") {
      return "status-approved";
    }
    if (st.includes("pending")) {
      return "status-pending";
    }
    if (
      st.includes("reject") ||
      st.includes("failed") ||
      st.includes("decline")
    ) {
      return "status-rejected";
    }
    return "status-default";
  }

  // getImageUrl(rec: any): string | null {
  //   if (!rec) return null;
  //   const raw = rec.raw || {};
  //   const fp = `${fileBaseUrl}/${raw.rejectionFilePath}`;
  //   if (!fp) return null;
  //   const trimmed = ("" + fp).trim();
  //   if (!trimmed || trimmed.toLowerCase().includes("null")) return null;
  //   if (/^https?:\/\//i.test(trimmed)) return trimmed;
  //   try {
  //     // return `${window.location.origin}${trimmed.startsWith("/") ? trimmed : "/" + trimmed}`;
  //     return `${location.origin}${trimmed.startsWith("/") ? trimmed : "/" + trimmed}`;
  //   } catch (e) {
  //     return trimmed;
  //   }
  // }
loadImages(rec: any) {
    if (!rec) return;

    const raw = rec.raw || {};

    rec.images = [];
    this.imageError = false;

    // ✅ alag-alag handle karo (clear logic)
    const paths = [];

    if (
      raw.filePath &&
      raw.filePath !== "null" &&
      raw.filePath !== "undefined" &&
      raw.filePath.trim() !== ""
    ) {
      paths.push(raw.filePath);
    }

    if (
      raw.rejectionFilePath &&
      raw.rejectionFilePath !== "null" &&
      raw.rejectionFilePath !== "undefined" &&
      raw.rejectionFilePath.trim() !== ""
    ) {
      paths.push(raw.rejectionFilePath);
    }

    // ❌ agar dono nahi hai
    if (paths.length === 0) {
      rec.images = [];
      return;
    }

    // ✅ API call for each
    paths.forEach((id: string) => {
      this.multimediaService.getPrivateImage(id).subscribe({
        next: (url) => {
          rec.images.push(url);
        },
        error: () => {
          this.imageError = true;
        },
      });
    });
  }
  

  onImageError(ev: any) {
    if (ev && ev.target) {
      ev.target.src = "";
    }
  }

  getDisplayFields(record: any): any[] {
    if (!record) return [];

    const mode =
      record.mode ||
      (record.vpa ? "upi" : record.accountNo ? "bank" : "payout");

    switch (mode) {
      case "upi":
        return [
          {
            label: "Portal",
            value: record.portal || record.raw?.portalDomain || "—",
          },
          { label: "VPA / UPI ID", value: record.vpa || record.upiId || "—" },
          { label: "Transaction ID", value: record.transactionId || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          { label: "Query Text", value: record.queryText || "—" },

          {
            label: "Settlement Status",
            value:
              record.settled === true
                ? "Settled"
                : record.settled === false
                  ? "Pending"
                  : "—",
          },
          // {
          //   label: "Review Status",
          //   value: record.reviewStatus || record.status || "—",
          // },
          {
            label: "Date",
            value: record.date ? new Date(record.date).toLocaleString() : "—",
          },
        ];

      case "bank":
        return [
          {
            label: "Portal",
            value: record.portal || record.raw?.portalDomain || "—",
          },
          { label: "Account Number", value: record.accountNo || "—" },
          { label: "Transaction ID", value: record.transactionId || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          { label: "Account Holder", value: record.holder || "—" },
          { label: "Query Text", value: record.queryText || "—" },

          {
            label: "Settlement Status",
            value:
              record.settled === true
                ? "Settled"
                : record.settled === false
                  ? "Pending"
                  : "—",
          },
          // {
          //   label: "Review Status",
          //   value: record.reviewStatus || record.status || "—",
          // },
          {
            label: "Date",
            value: record.date ? new Date(record.date).toLocaleString() : "—",
          },
        ];

      case "payout":
        return [
          { label: "Portal", value: record.portalDomain || "—" },
          { label: "User ID", value: record.userId || "—" },
          { label: "Account Number", value: record.accountNo || "—" },
          { label: "IFSC Code", value: record.ifscCode || "—" },
          { label: "Account Holder", value: record.holder || "—" },
          { label: "Amount", value: `₹ ${this.formatCurrency(record.amount)}` },
          { label: "Status", value: record.status || "—" },
          // { label: "Review Status", value: record.reviewStatus || "—" },
          { label: "Remarks", value: record.remarks || "—" },
          { label: "Query Text", value: record.queryText || "—" },
          // {
          //   label: "Rejection File Path",
          //   value: record.rejectionFilePath || "—",
          // },
          {
            label: "Date",
            value: record.date ? new Date(record.date).toLocaleString() : "—",
          },
        ];

      default:
        return [];
    }
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
      this.routeSub = null;
    }
  }

  refreshCurrentView(): void {
    if (!this.branchId) return;

    if (this.activeView === "upi") {
      this.fetchUpiTopups();
    } else if (this.activeView === "bank") {
      this.fetchBankTopups();
    } else if (this.activeView === "payout") {
      this.fetchApprovedPayouts();
    }
  }

  setPayoutPage(page: number) {
    const totalPages = this.payoutApprovedTotalPages();
    this.payoutApprovedPage = Math.max(0, Math.min(page, totalPages - 1));
  }

  getSelectedPortalDomain(view: 'upi' | 'bank' | 'payout'): string {
  let selectedId = '';
  
  if (view === 'upi') selectedId = this.upiPortalFilter;
  else if (view === 'bank') selectedId = this.bankPortalFilter;
  else selectedId = this.payoutPortalFilter;

  const found = this.portalOptions.find(p => p.id === selectedId);

  return found ? found.domain : 'All Portals';
}
}
