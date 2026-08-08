import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { Chart, registerables } from "chart.js";
import { catchError, forkJoin, lastValueFrom, of, Subscription } from "rxjs";
import { FundsService } from "../../../pages/services/funds.service";
import { UserStateService } from "../../../store/user-state.service";
import { SocketConfigService } from "../../../pages/services/socket/socket-config.service";
import { BankService } from "../../../pages/services/bank.service";
import { UpiService } from "../../../pages/services/upi.service";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { HeadService } from "../../../pages/services/head.service";
import { MultimediaService } from "../../../pages/services/multimedia.service";
import { ChiefService } from "../../../pages/services/chief.service";
import { BranchService } from "../../../pages/services/branch.service";
import { LoaderService } from "../../../pages/services/loader.service";
import { Fund } from "./../../../components/reports/funds-report/funds-report.component";

Chart.register(...registerables);

@Component({
  selector: "app-head-branch-dashboard",

  templateUrl: "./head-branch-dashboard.component.html",
  styleUrl: "./head-branch-dashboard.component.css",
})
export class HeadBranchDashboardComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild("trendChart") trendChartRef!: ElementRef;
  @ViewChild("payinMethodChart") payinMethodChartRef!: ElementRef;
  @ViewChild("payoutBankChart") payoutBankChartRef!: ElementRef;
  private expiryNotifiedIds = new Set<string>();

  private trendChart?: Chart;
  private payinMethodChart?: Chart;
  private payoutBankChart?: Chart;

  portals: any[] = [];

  pollingIntervals = [
    { value: 5000, label: "5 seconds" },
    { value: 10000, label: "10 seconds" },
    { value: 30000, label: "30 seconds" },
    { value: 60000, label: "1 minute" },
  ];

  timePeriods = [
    { label: "7 Days", value: 7, active: true },
    { label: "30 Days", value: 30, active: false },
    { label: "90 Days", value: 90, active: false },
  ];

  selectedPollingInterval = 5000000;
  pollIntervalId: any;

  totalpayins = 0;
  totalpayouts = 0;
  activeAccounts = 0;
  showPendingThreads = false;
  autoRefreshBroadcast = false;
  isRejecting = false;
  isApproving = false;
  payinActive = true;
  payoutActive = true;
  mobilePage = 1;
  mobilePageSize = 1000;
  mobilePageSizes = [1000];
  payoutDropdownOpen = false;
  payoutSearchQuery = "";

  cachedMobileTransactions: any[] = [];
  cachedPendingBank: any[] = [];
  cachedPendingPayouts: any[] = [];
  cachedPendingUpi: any[] = [];
  cachedApprovedPayins: any[] = [];
  cachedApprovedPayouts: any[] = [];

  pendingTransactions: any[] = [];
  approvedTransactions: any[] = [];
  approvedpayins: any[] = [];
  approvedpayouts: any[] = [];
  private dynamicPayinConfig: any = null;
  private dynamicPayoutConfig: any = null;

  // Pay-in linked user info (payout cards ke liye)
  showPayoutColModal = false;
  showPayinColModal = false;
  payinData: any[] = [];
  payinColData: any[] = [];
  loadingPayinDetails = false;
  payinColLoading = false;
  showAllPayoutAccounts = false;
  showAllPayinAccounts = false;

  // Payin history modal (payin card + payout card dono se open hota hai)
  showPayinHistoryModal = false;
  payinHistoryData: any[] = [];
  loadingPayinHistory = false;
  showAllPayinHistoryAccounts = false;

  // Payout history modal (sirf payout card se — repeated payout user)
  showPayoutHistoryModal = false;
  payoutHistoryData: any[] = [];
  loadingPayoutHistory = false;
  showAllPayoutHistoryAccounts = false;

  pendingUpi: any[] = [];
  pendingBank: any[] = [];
  pendingpayouts: any[] = [];

  showImagePopup: boolean = false;
  popupImageUrl: string | null = null;

  branchCom = 0;
  acceptedUpi = 0;
  acceptedBank = 0;
  acceptedDep = 0;

  processingNow = Date.now();
  private processingTimerId: any = null;

  previewDocument: boolean = false;
  previewUrl: string | null = null;

  acceptedWid: any;

  recentpayins: any[] = [];
  recentpayouts: any[] = [];

  selectedTransaction: any = null;

  selectedFile: File | null = null;
  isDragging = false;

  pendingCrypto: any[] = [];
  cachedPendingCrypto: any[] = [];
  pendingCryptoPage = 1;
  pendingCryptoPageSize = 1000;
  cachedPendingPayinAll: any[] = [];

  private cryptoTypes = ["SPL", "ERC20", "TRC20", "OMNI", "BEP20"];

  pendingFilterType: "all" | "payin" | "payout" = "all";
  pendingFilterMethod: "all" | "upi" | "bank" = "all";
  mobileFilter: "all" | "upi" | "bank" | "crypto" | "payout" = "all";

  approvedpayinsFilterMethod: "all" | "upi" | "bank" = "all";
  approvedpayoutsFilterMethod: "all" | "bank" = "all";

  selectedTimeRange = 7;

  private colorScheme = {
    payin: "#10b981",
    payinLight: "#34d399",
    payinDark: "#059669",
    payout: "#3b82f6",
    payoutLight: "#60a5fa",
    payoutDark: "#2563eb",
    upi: "#8b5cf6",
    upiLight: "#a78bfa",
    bank: "#06b6d4",
    bankLight: "#22d3ee",
  };

  entityId: any;
  userId: any;

  private routeSub: Subscription | null = null;

  approvedPage = 1;
  approvedPageSize = 1000;
  approvedPageSizes = [1000];

  pendingUpiPage = 1;
  pendingUpiPageSize = 1000;

  pendingBankPage = 1;
  pendingBankPageSize = 1000;

  pendingPayoutPage = 1;
  pendingPayoutPageSize = 1000;
  pendingPageSizes = [1000];

  payoutApprovedPage = 1;
  payoutApprovedPageSize = 1000;
  payoutApprovedPageSizes = [1000];
  showApproveConfirm = false;
  showRejectConfirm = false;
  confirmTransaction: any = null;
  reason: any = "rejects";
  customReason: string = "";

  payinCurrencySums: {
    currency: string;
    symbol: string;
    total: number;
  }[] = [];

  payoutCurrencySums: {
    currency: string;
    symbol: string;
    total: number;
  }[] = [];

  payinRejectReasons: string[] = [
    "Amount Not Recieved",
    "Duplicate Transaction (Used Transaction Reciept)",
    "Transaction in Inactive Account",
    "Suspicious Account Activity",
  ];

  payoutRejectReasons: string[] = [
    "Invalid beneficiary account details",
    "Beneficiary account limit reached",
    "Inactive Beneficiary (Amount refunded)",
  ];

  sse: any;
  banks: any;
  upis: any;

  showEditAmountPopup: boolean = false;
  editAmountData: any = {
    newAmount: 0,
    message: "",
    file: null,
    isDragging: false,
  };
  role: any;
  private lastBroadcastData: any = null;

  payoutInventoryOptions: Array<{
    id: string;
    accountId: string; // yahi backend ko "accountId" ke naam se jaayega
    kind: "bank" | "upi" | "crypto";
    label: string;
    subLabel?: string;
    raw: any;
  }> = [];
  selectedPayoutInventory: any = null;
  loadingPayoutInventory = false;

  payinStatus: any = false;
  private realtimeUpdateInterval: any = null;
  private latestDynamicPayin: any = null;
  private latestDynamicPayout: any = null;
  constructor(
    private fundService: FundsService,
    private userStateService: UserStateService,
    private socketConfigService: SocketConfigService,

    private snackbar: SnackbarService,
    private headService: HeadService,
    private multimediaService: MultimediaService,
    private chiefService: ChiefService,
    private branchService: BranchService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();

    this.chiefService
      .getCurrenciesByEntity(this.entityId, this.role)
      .subscribe();

    this.getPayinStatus();

    this.loadBroadcast();

    this.resetAllLists();

    this.socketConfigService.subscribeToPendingData(this.entityId);

    this.sse = this.socketConfigService.getPendingData().subscribe((data) => {
      if (!data) return;

      this.lastBroadcastData = data;

      if (data?.DYNAMIC_PAYIN_TIME) {
        this.dynamicPayinConfig = structuredClone(data.DYNAMIC_PAYIN_TIME);
        this.latestDynamicPayin = this.dynamicPayinConfig;
      }

      if (data?.DYNAMIC_PAYOUT_TIME) {
        this.dynamicPayoutConfig = structuredClone(data.DYNAMIC_PAYOUT_TIME);
        this.latestDynamicPayout = this.dynamicPayoutConfig;
      }

      this.processIncomingEvent(data);
    });

    if (this.lastBroadcastData) {
      this.processIncomingEvent(this.lastBroadcastData);
    }

    this.startSlabTimer();
  }
  loadBroadcast(): void {
    this.fundService
      .broadcast(this.entityId, this.role)
      .subscribe((data: any) => {
        this.lastBroadcastData = data;

        if (data?.DYNAMIC_PAYIN_TIME && !this.dynamicPayinConfig) {
          this.dynamicPayinConfig = structuredClone(data.DYNAMIC_PAYIN_TIME);
          this.latestDynamicPayin = this.dynamicPayinConfig;
        }

        if (data?.DYNAMIC_PAYOUT_TIME && !this.dynamicPayoutConfig) {
          this.dynamicPayoutConfig = structuredClone(data.DYNAMIC_PAYOUT_TIME);
          this.latestDynamicPayout = this.dynamicPayoutConfig;
        }

        this.processIncomingEvent(data);
      });
  }

  private getPayinStatus() {
    if (this.role === "HEAD") {
      this.headService.getHeadById(this.entityId).subscribe((res) => {
        this.payinStatus = res.payin;
      });
    } else if (this.role === "BRANCH") {
      this.branchService.getBranchById(this.entityId).subscribe((res) => {
        this.payinStatus = res.payin;
      });
    }
  }

  changePayinStatus() {
    this.loaderService.showButtonLoader();
    if (this.role === "HEAD") {
      this.headService.toggleDashbaordPayin(this.entityId).subscribe(
        () => {
          this.payinStatus = !this.payinStatus;

          this.loaderService.hideButtonLoader();

          this.snackbar.show(
            `Payin ${this.payinStatus ? "enabled" : "disabled"} successfully`,
            true,
          );
        },
        (err) => {
          this.loaderService.hideButtonLoader();

          this.snackbar.show(
            err?.error?.message || "Failed to change payin status",
            false,
          );
        },
      );
    } else if (this.role === "BRANCH") {
      this.branchService.toggleDashbaordPayin(this.entityId).subscribe(
        () => {
          this.payinStatus = !this.payinStatus;

          this.loaderService.hideButtonLoader();

          this.snackbar.show(
            `Payin ${this.payinStatus ? "enabled" : "disabled"} successfully`,
            true,
          );
        },
        (err) => {
          this.loaderService.hideButtonLoader();

          this.snackbar.show(
            err?.error?.message || "Failed to change payin status",
            false,
          );
        },
      );
    }
  }

  private resetAllLists() {
    this.pendingTransactions = [];
    this.approvedTransactions = [];
    this.approvedpayins = [];
    this.approvedpayouts = [];
    this.recentpayins = [];
    this.pendingCrypto = [];
    this.recentpayouts = [];

    this.pendingUpi = [];
    this.pendingBank = [];
    this.pendingpayouts = [];
  }

  private refreshAllFunds(entityId?: string) {
    if (!entityId) entityId = this.entityId;
    if (!entityId) return;

    this.approvedpayins = [];
    this.approvedpayouts = [];
    this.approvedTransactions = [];

    const bankObs = this.fundService
      .getAllBankFundWithBranchId(entityId, "ACCEPTED")
      .pipe(catchError((e) => of([])));
    const upiObs = this.fundService
      .getAllUpiFundWithBranchId(entityId, "ACCEPTED")
      .pipe(catchError((e) => of([])));
    const withdrawObs = this.fundService
      .getAllpayoutTrueFalseBybranchId(entityId, "ACCEPTED")
      .pipe(catchError((e) => of([])));

    forkJoin({ bank: bankObs, upi: upiObs, payout: withdrawObs }).subscribe(
      (res: any) => {
        this.mapFundsArray(res.upi || [], "upi", true);
        this.mapFundsArray(res.bank || [], "bank", true);

        this.mappayoutsArray(res.payout || []);

        const upiArr = Array.isArray(res.upi) ? res.upi : [];
        const bankArr = Array.isArray(res.bank) ? res.bank : [];
        const withdrawArr = Array.isArray(res.payout) ? res.payout : [];

        this.acceptedUpi = upiArr.reduce(
          (s: number, a: any) => s + (Number(a.amount) || 0),
          0,
        );
        this.acceptedBank = bankArr.reduce(
          (s: number, a: any) => s + (Number(a.amount) || 0),
          0,
        );
        this.acceptedWid = withdrawArr.reduce(
          (s: number, a: any) => s + (Number(a.amount) || 0),
          0,
        );

        this.acceptedDep = this.acceptedBank + this.acceptedUpi;

        this.attachExistsInPayoutFunds();

        this.computeStatsFromData();
        this.updateChartsFromData();
        this.clampPages();
        this.ensureProcessingTimerState();
      },
      (err) => {},
    );
    this.refreshCachedLists();
  }

  private mapFundsArray(
    funds: any[],
    mode: "bank" | "upi",
    settledFlag: boolean,
  ): void {
    if (!Array.isArray(funds) || funds.length === 0) return;

    for (const fund of funds) {
      try {
        const rawPath = fund.filePath || null;

        const tx = {
          id: fund.id || null,
          fundId: fund.id || null,
          fundtype: fund.fundtype,
          type: "payin",
          portal:
            fund.portalName || fund.portalDomain || fund.portalId || "Portal",
          amount: Number(fund.amount) || 0,

          date: fund.createdAt
            ? new Date(fund.createdAt)
            : fund.dateTime
              ? new Date(fund.dateTime)
              : new Date(),
          utrNumber: fund.transactionId || fund.utr || null,
          parentCurrency: fund.parentCurrency,
          currencyWiseAmount: Number(fund.currencyWiseAmount) || 0,
          rate: fund.rate || 1,
          mode: mode,
          accountNo: fund.accountNo || null,
          bankId: fund.bankId || null,
          bankName: fund.bankName || fund.bank || null,

          filePath: rawPath,
          fileUrl: "",

          remarks: fund.remarks || null,
          settled: !!fund.settled,
          raw: fund,
          upiId: fund.vpa,
        };

        if (tx.filePath) {
          this.multimediaService.getPrivateImage(tx.filePath).subscribe({
            next: (url) => {
              tx.fileUrl = url;

              if (this.selectedTransaction?.id === tx.id) {
                this.selectedTransaction = { ...tx };
              }
            },
            error: () => {
              tx.fileUrl = "";
            },
          });
        }

        if (settledFlag || tx.settled) {
          const approvedTx = { ...tx, status: "completed" };
          this.approvedTransactions.unshift(approvedTx);
          this.approvedpayins.unshift(approvedTx);
        } else {
          if (mode === "upi") {
            this.pendingUpi.unshift(tx);
          } else {
            this.pendingBank.unshift(tx);
          }
        }
      } catch (err) {}
    }
  }
  private mappayoutsArray(payouts: any[]): void {
    if (!Array.isArray(payouts) || payouts.length === 0) return;

    for (const w of payouts) {
      try {
        const rawPath = w.filePath || null;

        const tx = {
          id: w.id || null,
          fundId: w.id || null,
          type: "payout",
          portal: w.portalName || w.portalDomain || w.portalId || null,
          amount: Number(w.amount) || 0,
          date: w.createdAt ? new Date(w.createdAt) : new Date(),
          utrNumber: w.transactionId || w.utr || null,
          parentCurrency: w.parentCurrency || null,
          currency: w.currency || null,
          currencyWiseAmount: Number(w.currencyWiseAmount) || 0,
          rate: w.rate || 1,
          mode: "bank",
          accountNo: w.accountNo || w.accountNumber || null,
          bankId: w.bankId || null,
          bankName: w.bankName || w.bank || null,
          filePath: rawPath,
          fileUrl: "",
          remarks: w.remarks || w.message || null,
          settled: !!w.settled,
          raw: w,
          holderName: w.bankAccountHolderName || null,
          holder: w.holder || null,
          ifscCode: w.ifsc || null,
          fundDisplayId: w.displayId || null,
          existsInPayinFunds: w.existsInPayinFunds ?? 0,
          userId: w.userId || null,
        };

        if (tx.filePath) {
          if (tx.filePath.startsWith("http")) {
            tx.fileUrl = tx.filePath;
          } else {
            this.multimediaService.getPrivateImage(tx.filePath).subscribe({
              next: (url) => {
                tx.fileUrl = url;

                if (this.selectedTransaction?.id === tx.id) {
                  this.selectedTransaction = { ...tx };
                }
              },
              error: () => (tx.fileUrl = ""),
            });
          }
        }

        if (tx.settled) {
          const approvedTx = { ...tx, status: "completed" };
          this.approvedTransactions.unshift(approvedTx);
          this.approvedpayouts.unshift(approvedTx);
        } else {
          this.pendingpayouts.unshift(tx);
        }
      } catch (err) {}
    }

    this.attachExistsInPayoutFunds();
  }

  private extractPortalsFromFetched(allFunds: any[]): void {
    if (!Array.isArray(allFunds)) return;
    const seen = new Set<string>();
    const sites: { name: string; id?: any }[] = [];
    for (const f of allFunds) {
      const name = f.portalName || f.portalDomain || f.portalId || null;
      if (name && !seen.has(name)) {
        seen.add(name);
        sites.push({ name, id: f.portalId || null });
      }
    }
    if (sites.length) this.portals = sites;
  }

  private computeStatsFromData(): void {
    this.totalpayins = this.approvedpayins.reduce(
      (s, r) => s + (Number(r.amount) || 0),
      0,
    );
    this.totalpayouts = this.approvedpayouts.reduce(
      (s, r) => s + (Number(r.amount) || 0),
      0,
    );

    const allPending = [
      ...this.pendingUpi,
      ...this.pendingBank,
      ...this.pendingCrypto,

      ...this.pendingpayouts,
    ];

    const uniqueAccounts = new Set<string>();
    for (const p of allPending) {
      if (p.accountNo) uniqueAccounts.add(p.accountNo);
      else if (p.bankId) uniqueAccounts.add(p.bankId);
      else if (p.portal) uniqueAccounts.add(p.portal);
    }
    this.activeAccounts = uniqueAccounts.size;
    this.updateCurrencySums();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
      this.updateChartsFromData();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.processingTimerId) {
      clearInterval(this.processingTimerId);
      this.processingTimerId = null;
    }
    if (this.sse) {
      this.sse.unsubscribe();
      this.sse = undefined;
    }

    this.socketConfigService.unsubscribePendingData();
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
    this.routeSub?.unsubscribe();
    this.destroyCharts();
  }
  private parseProcessingDeadline(tx: any): Date | null {
    if (!tx) return null;

    const v =
      tx.processingTimeLimit ?? (tx.raw && tx.raw.processingTimeLimit) ?? null;
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  isPayoutActionBlocked(tx: any): boolean {
    if (!tx) return true;
    if (tx.type !== "payout") return false;
    if (!tx.processing) return true;
    const deadline = this.parseProcessingDeadline(tx);
    if (!deadline) return true;
    return Date.now() > deadline.getTime();
  }

  // getRemainingTimeLabel(tx: any): string {
  //   if (!tx || !tx.processing) return "Process";
  //   const deadline = this.parseProcessingDeadline(tx);

  //   if (!deadline) return "Process";

  //   const diffMs = deadline.getTime() - this.processingNow;

  //   if (diffMs <= 0) {
  //     return "Process";
  //   }

  //   const totalSec = Math.floor(diffMs / 1000);

  //   const h = Math.floor(totalSec / 3600);
  //   const m = Math.floor((totalSec % 3600) / 60);
  //   const s = totalSec % 60;

  //   const pad = (n: number) => n.toString().padStart(2, "0");

  //   return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  // }

  getRemainingTimeLabel(tx: any): string {
    if (!tx || !tx.processing) return "Process";
    const deadline = this.parseProcessingDeadline(tx);

    if (!deadline) return "Process";

    const diffMs = deadline.getTime() - this.processingNow;

    if (diffMs <= 0) {
      return "Process";
    }

    const totalSec = Math.floor(diffMs / 1000);

    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  private initCharts(): void {
    this.initTrendChart();
    this.initpayinMethodChart();
    this.initpayoutBankChart();
  }

  private normalizeIdValues(obj: any): string[] {
    if (!obj) return [];
    const vals = [
      obj.fundId,
      obj.id,
      obj._id,
      obj.utrNumber,
      obj.transactionId,
      obj.utr,
      (obj.raw && (obj.raw.id || obj.raw._id || obj.raw.transactionId)) || null,
    ];
    return vals.filter(Boolean).map((v: any) => String(v));
  }

  private identifiersMatch(a: any, b: any): boolean {
    const aIds = this.normalizeIdValues(a);
    const bIds = this.normalizeIdValues(b);
    if (aIds.length === 0 || bIds.length === 0) return false;
    return aIds.some((id) => bIds.includes(id));
  }

  private removeFromPendingListsByTx(tx: any): void {
    if (!tx) return;

    const removeFrom = (list: any[]) => {
      for (let i = list.length - 1; i >= 0; i--) {
        try {
          if (this.identifiersMatch(list[i], tx)) {
            list.splice(i, 1);
          }
        } catch (e) {}
      }
    };
    removeFrom(this.pendingUpi);
    removeFrom(this.pendingBank);
    removeFrom(this.pendingCrypto);
    removeFrom(this.pendingpayouts);
  }

  private addApprovedUnique(list: any[], tx: any): void {
    try {
      const exists = list.some((x) => this.identifiersMatch(x, tx));
      if (!exists) list.unshift(tx);
    } catch (e) {
      list.unshift(tx);
    }
  }

  private resetRejectReason(): void {
    this.reason = "rejects";
  }

  private initTrendChart(): void {
    const ctx =
      this.trendChartRef?.nativeElement?.getContext &&
      this.trendChartRef.nativeElement.getContext("2d");
    if (!ctx) return;
    this.trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: this.getLastNDatesLabels(this.selectedTimeRange).map((l) =>
          new Date(l).toLocaleDateString(),
        ),
        datasets: [
          {
            label: "payins",
            data: new Array(this.selectedTimeRange).fill(0),
            borderColor: this.colorScheme.payin,
            backgroundColor: this.hexToRgba(this.colorScheme.payin, 0.1),
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: this.colorScheme.payin,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverBackgroundColor: this.colorScheme.payinDark,
            pointHoverBorderColor: "#fff",
          },
          {
            label: "payouts",
            data: new Array(this.selectedTimeRange).fill(0),
            borderColor: this.colorScheme.payout,
            backgroundColor: this.hexToRgba(this.colorScheme.payout, 0.1),
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: this.colorScheme.payout,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverBackgroundColor: this.colorScheme.payoutDark,
            pointHoverBorderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 13,
                weight: "bold",
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: (ctx) => {
                return `${ctx.dataset.label}: ₹${Number(
                  ctx.parsed.y,
                ).toLocaleString("en-IN")}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              callback: (v) => "₹" + v,
              font: {
                size: 11,
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              autoSkip: true,
              maxRotation: 0,
              font: {
                size: 11,
              },
            },
          },
        },
      },
    });
  }

  private initpayinMethodChart(): void {
    const ctx =
      this.payinMethodChartRef?.nativeElement?.getContext &&
      this.payinMethodChartRef.nativeElement.getContext("2d");

    if (!ctx) return;
    this.payinMethodChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["UPI", "Bank"],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: [this.colorScheme.upi, this.colorScheme.bank],
            borderColor: "#fff",
            borderWidth: 3,
            hoverOffset: 10,
            hoverBorderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 13,
                weight: "bold",
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: ₹${Number(ctx.raw).toLocaleString("en-IN")}`,
            },
          },
        },
      },
    });
  }

  private initpayoutBankChart(): void {
    const ctx =
      this.payoutBankChartRef?.nativeElement?.getContext &&
      this.payoutBankChartRef.nativeElement.getContext("2d");
    if (!ctx) return;
    this.payoutBankChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "payout Amount",
            data: [],
            backgroundColor: this.colorScheme.payout,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: this.colorScheme.payoutDark,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: (ctx) =>
                `Amount: ₹${Number(ctx.parsed.y).toLocaleString("en-IN")}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              callback: (v) => "₹" + v,
              font: {
                size: 11,
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              autoSkip: false,
              font: {
                size: 11,
              },
            },
          },
        },
      },
    });
  }

  private destroyCharts(): void {
    this.trendChart?.destroy();
    this.payinMethodChart?.destroy();
    this.payoutBankChart?.destroy();
  }

  private ensureChartsInitialized(): void {
    try {
      if (!this.trendChart && this.trendChartRef?.nativeElement) {
        this.initTrendChart();
      }
      if (!this.payinMethodChart && this.payinMethodChartRef?.nativeElement) {
        this.initpayinMethodChart();
      }
      if (!this.payoutBankChart && this.payoutBankChartRef?.nativeElement) {
        this.initpayoutBankChart();
      }
    } catch (e) {}
  }

  private updateChartsFromData(): void {
    this.ensureChartsInitialized();

    requestAnimationFrame(() => {
      const payinsAll = [...this.pendingUpi, ...this.pendingBank];
      const upiSum = this.acceptedUpi;
      const bankSum = this.acceptedBank;

      if (this.payinMethodChart) {
        try {
          this.payinMethodChart.data.datasets[0].data = [upiSum, bankSum];
          this.payinMethodChart.update();
        } catch (e) {}
      }

      const payoutsAll = [...this.approvedpayouts, ...this.pendingpayouts];

      const bankMap = new Map<string, number>();
      for (const f of payoutsAll) {
        const key = f.bankName || f.accountNo || f.holder || "Unknown Bank";
        bankMap.set(key, (bankMap.get(key) || 0) + (Number(f.amount) || 0));
      }
      const sortedBanks = Array.from(bankMap.entries()).sort(
        (a, b) => b[1] - a[1],
      );
      const topBanks = sortedBanks.slice(0, 10);
      const bankLabels = topBanks.map((x) => x[0]);
      const bankValues = topBanks.map((x) => x[1]);

      if (this.payoutBankChart) {
        try {
          this.payoutBankChart.data.labels = bankLabels;
          (this.payoutBankChart.data.datasets[0].data as any) = bankValues;
          this.payoutBankChart.update();
        } catch (e) {}
      }

      const labels = this.getLastNDatesLabels(this.selectedTimeRange);
      const payinArr = new Array(this.selectedTimeRange).fill(0);
      const payoutArr = new Array(this.selectedTimeRange).fill(0);

      for (const f of payinsAll) {
        const dateStr = new Date(f.date).toDateString();
        const idx = labels.findIndex(
          (lbl) => new Date(lbl).toDateString() === dateStr,
        );
        if (idx >= 0) payinArr[idx] += Number(f.amount) || 0;
      }
      for (const f of payoutsAll) {
        const dateStr = new Date(f.date).toDateString();
        const idx = labels.findIndex(
          (lbl) => new Date(lbl).toDateString() === dateStr,
        );
        if (idx >= 0) payoutArr[idx] += Number(f.amount) || 0;
      }

      if (this.trendChart) {
        try {
          this.trendChart.data.labels = labels.map((l) =>
            new Date(l).toLocaleDateString(),
          );
          (this.trendChart.data.datasets[0].data as any) = payinArr;
          (this.trendChart.data.datasets[1].data as any) = payoutArr;
          this.trendChart.update();
        } catch (e) {}
      }
    });
  }

  private getLastNDatesLabels(n: number): string[] {
    const arr: string[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      arr.push(d.toISOString());
    }
    return arr;
  }

  formatCurrency(amount: number): string {
    return "₹" + (Number(amount) || 0).toLocaleString("en-IN");
  }

  getTimePeriodClass(active: boolean): string {
    const baseClass =
      "px-4 py-2 rounded-xl font-bold transition-all duration-200 text-sm";
    return active
      ? baseClass +
          " bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
      : baseClass +
          " bg-white text-slate-600 hover:bg-slate-100 border border-slate-200";
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      completed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      pending: "bg-amber-100 text-amber-800 border border-amber-200",
      processing: "bg-blue-100 text-blue-800 border border-blue-200",
      failed: "bg-rose-100 text-rose-800 border border-rose-200",
    };
    return (
      classes[status] || "bg-slate-100 text-slate-800 border border-slate-200"
    );
  }

  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getPollingLabel(): string {
    const found = this.pollingIntervals.find(
      (p) => p.value === this.selectedPollingInterval,
    );
    return found
      ? found.label
      : `${Math.round(this.selectedPollingInterval / 1000)}s`;
  }

  setActiveTimePeriod(period: any): void {
    this.timePeriods.forEach((p) => (p.active = false));
    period.active = true;
    this.selectedTimeRange = period.value;
    this.updateChartsFromData();
  }

  onPendingFilterChange() {
    this.pendingUpiPage = 1;
    this.pendingBankPage = 1;
    this.pendingCryptoPage = 1;
    this.pendingPayoutPage = 1;
  }

  onApprovedpayinsFilterChange() {
    this.approvedPage = 1;
  }

  onApprovedpayoutsFilterChange() {
    this.payoutApprovedPage = 1;
  }

  viewTransactionDetails(transaction: any): void {
    if (transaction.filePath) {
      this.multimediaService.getPrivateImage(transaction.filePath).subscribe({
        next: (url) => {
          transaction.fileUrl = url;
        },
        error: () => {
          transaction.fileUrl = "";
        },
      });
    }

    if (!transaction) return;

    this.selectedTransaction = this.normalizeTransaction(transaction);
  }

  filteredPending(): any[] {
    const all = [
      ...this.pendingUpi,
      ...this.pendingBank,
      ...this.pendingpayouts,
    ];
    return all.filter((t) => {
      if (this.pendingFilterType !== "all" && t.type !== this.pendingFilterType)
        return false;
      if (this.pendingFilterMethod !== "all") {
        if (this.pendingFilterMethod === "upi" && t.mode !== "upi")
          return false;
        if (
          this.pendingFilterMethod === "bank" &&
          t.mode !== "bank" &&
          t.type !== "payout"
        )
          return false;
      }
      return true;
    });
  }

  filteredPendingUpi(): any[] {
    return this.pendingUpi.filter((t) => {
      if (this.pendingFilterType !== "all" && t.type !== this.pendingFilterType)
        return false;
      if (this.pendingFilterMethod !== "all") {
        if (this.pendingFilterMethod === "upi" && t.mode !== "upi")
          return false;
        if (this.pendingFilterMethod === "bank" && t.mode !== "bank")
          return false;
      }
      return true;
    });
  }

  pagedPendingUpi(): any[] {
    const list = this.filteredPendingUpi();
    const start = (this.pendingUpiPage - 1) * this.pendingUpiPageSize;
    return list.slice(start, start + this.pendingUpiPageSize);
  }

  filteredPendingBank(): any[] {
    return this.pendingBank.filter((t) => {
      if (this.pendingFilterType !== "all" && t.type !== this.pendingFilterType)
        return false;
      if (this.pendingFilterMethod !== "all") {
        if (this.pendingFilterMethod === "upi" && t.mode !== "upi")
          return false;
        if (this.pendingFilterMethod === "bank" && t.mode !== "bank")
          return false;
      }
      return true;
    });
  }
  filteredPendingCrypto(): any[] {
    return this.pendingCrypto.filter((t) => {
      if (this.pendingFilterType !== "all" && t.type !== this.pendingFilterType)
        return false;
      return true;
    });
  }

  pagedPendingCrypto(): any[] {
    const list = this.filteredPendingCrypto();
    const start = (this.pendingCryptoPage - 1) * this.pendingCryptoPageSize;
    return list.slice(start, start + this.pendingCryptoPageSize);
  }

  pendingCryptoTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(
        this.filteredPendingCrypto().length / this.pendingCryptoPageSize,
      ),
    );
  }

  setPendingCryptoPage(p: number) {
    this.pendingCryptoPage = Math.min(
      Math.max(1, p),
      this.pendingCryptoTotalPages(),
    );
  }

  pagedPendingBank(): any[] {
    const list = this.filteredPendingBank();
    const start = (this.pendingBankPage - 1) * this.pendingBankPageSize;
    return list.slice(start, start + this.pendingBankPageSize);
  }

  filteredPendingpayouts(): any[] {
    return this.pendingpayouts.filter((t) => {
      if (this.pendingFilterType !== "all" && t.type !== this.pendingFilterType)
        return false;
      if (this.pendingFilterMethod !== "all") {
        if (this.pendingFilterMethod === "upi" && t.mode !== "upi")
          return false;
        if (this.pendingFilterMethod === "bank" && t.mode !== "bank")
          return false;
      }
      return true;
    });
  }

  pagedPendingpayouts(): any[] {
    const list = this.filteredPendingpayouts();
    const start = (this.pendingPayoutPage - 1) * this.pendingPayoutPageSize;
    return list.slice(start, start + this.pendingPayoutPageSize);
  }

  filteredApprovedpayins(): any[] {
    return this.approvedpayins.filter((d) => {
      if (this.approvedpayinsFilterMethod !== "all") {
        return d.mode === this.approvedpayinsFilterMethod;
      }
      return true;
    });
  }

  pagedApprovedpayins(): any[] {
    const list = this.filteredApprovedpayins();
    const start = (this.approvedPage - 1) * this.approvedPageSize;
    return list.slice(start, start + this.approvedPageSize);
  }

  filteredApprovedpayouts(): any[] {
    return this.approvedpayouts.filter((w) => {
      if (this.approvedpayoutsFilterMethod !== "all") {
        return w.mode === this.approvedpayoutsFilterMethod;
      }
      return true;
    });
  }

  pagedApprovedpayouts(): any[] {
    const list = this.filteredApprovedpayouts();
    const start = (this.payoutApprovedPage - 1) * this.payoutApprovedPageSize;
    return list.slice(start, start + this.payoutApprovedPageSize);
  }

  approvedTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredApprovedpayins().length / this.approvedPageSize),
    );
  }

  pendingUpiTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredPendingUpi().length / this.pendingUpiPageSize),
    );
  }

  pendingBankTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredPendingBank().length / this.pendingBankPageSize),
    );
  }

  pendingPayoutTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(
        this.filteredPendingpayouts().length / this.pendingPayoutPageSize,
      ),
    );
  }

  payoutApprovedTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(
        this.filteredApprovedpayouts().length / this.payoutApprovedPageSize,
      ),
    );
  }

  setApprovedPage(p: number) {
    this.approvedPage = Math.min(Math.max(1, p), this.approvedTotalPages());
  }

  setPendingUpiPage(p: number) {
    this.pendingUpiPage = Math.min(Math.max(1, p), this.pendingUpiTotalPages());
  }

  setPendingBankPage(p: number) {
    this.pendingBankPage = Math.min(
      Math.max(1, p),
      this.pendingBankTotalPages(),
    );
  }

  setPendingPayoutPage(p: number) {
    this.pendingPayoutPage = Math.min(
      Math.max(1, p),
      this.pendingPayoutTotalPages(),
    );
  }
  setpayoutApprovedPage(p: number) {
    this.payoutApprovedPage = Math.min(
      Math.max(1, p),
      this.payoutApprovedTotalPages(),
    );
  }

  onChangeApprovedPageSize(size: number) {
    this.approvedPageSize = size;
    this.approvedPage = 1;
  }

  onChangePendingUpiPageSize(size: number) {
    this.pendingUpiPageSize = size;
    this.pendingUpiPage = 1;
  }

  onChangePendingBankPageSize(size: number) {
    this.pendingBankPageSize = size;
    this.pendingBankPage = 1;
  }

  onChangePendingPayoutPageSize(size: number) {
    this.pendingPayoutPageSize = size;
    this.pendingPayoutPage = 1;
  }
  onChangepayoutApprovedPageSize(size: number) {
    this.payoutApprovedPageSize = size;
    this.payoutApprovedPage = 1;
  }

  private clampPages() {
    if (this.approvedPage > this.approvedTotalPages())
      this.approvedPage = this.approvedTotalPages();

    if (this.pendingUpiPage > this.pendingUpiTotalPages())
      this.pendingUpiPage = this.pendingUpiTotalPages();

    if (this.pendingBankPage > this.pendingBankTotalPages())
      this.pendingBankPage = this.pendingBankTotalPages();
    if (this.pendingCryptoPage > this.pendingCryptoTotalPages())
      this.pendingCryptoPage = this.pendingCryptoTotalPages();

    if (this.pendingPayoutPage > this.pendingPayoutTotalPages())
      this.pendingPayoutPage = this.pendingPayoutTotalPages();

    if (this.payoutApprovedPage > this.payoutApprovedTotalPages())
      this.payoutApprovedPage = this.payoutApprovedTotalPages();
  }

  // async approveTransaction(transaction: any): Promise<void> {
  //   if (!transaction) return;

  //   this.loaderService.showButtonLoader();

  //   const t = this.normalizeTransaction(transaction) || transaction;

  //   const fundId =
  //     t.fundId ||
  //     t.id ||
  //     (t.raw && (t.raw.id || t.raw._id || t.raw.fundId)) ||
  //     null;

  //   try {
  //     if (t.type === "payout") {
  //       const accountId =
  //         this.selectedPayoutMethod === "upi"
  //           ? this.selectedUpi
  //           : this.selectedPayoutMethod === "bank"
  //             ? this.selectedBank
  //             : null;

  //       const formData = new FormData();

  //       if (accountId) {
  //         formData.append("accountId", String(accountId));
  //       }

  //       if (this.selectedFile) {
  //         formData.append("file", this.selectedFile, this.selectedFile.name);
  //       }

  //       await lastValueFrom(this.fundService.acceptPayout(fundId, formData));
  //     } else if (t.mode === "upi") {
  //       await lastValueFrom(this.fundService.settleUpiFund(fundId));
  //     } else if (t.mode === "bank") {
  //       await lastValueFrom(this.fundService.settleBankFund(fundId));
  //     } else if (t.mode === "crypto") {
  //       await lastValueFrom(this.fundService.settleCryptoFund(fundId));
  //     } else {
  //       this.snackbar.show("Unknown transaction type, cannot approve", false);
  //       this.loaderService.hideButtonLoader();
  //       return;
  //     }

  //     this.snackbar.show("Transaction approved successfully", true);

  //     this.removeFromPendingListsByTx(t);

  //     const approvedTx = {
  //       ...t,
  //       status: "completed",
  //       settled: true,
  //       date: t.date instanceof Date ? t.date : new Date(t.date),
  //     };

  //     if (approvedTx.type === "payout") {
  //       this.addApprovedUnique(this.approvedTransactions, approvedTx);
  //       this.addApprovedUnique(this.approvedpayouts, approvedTx);
  //       this.recentpayouts = [...this.approvedpayouts];
  //     } else {
  //       this.addApprovedUnique(this.approvedTransactions, approvedTx);
  //       this.addApprovedUnique(this.approvedpayins, approvedTx);
  //       this.recentpayins = [...this.approvedpayins];
  //     }

  //     this.confirmTransaction = null;
  //     this.showApproveConfirm = false;
  //     this.selectedTransaction = null;
  //     this.selectedFile = null;

  //     this.resetRejectReason();

  //     this.computeStatsFromData();
  //     this.updateChartsFromData();
  //     this.clampPages();
  //     this.ensureProcessingTimerState();

  //     this.loaderService.hideButtonLoader();
  //   } catch (err: any) {
  //     const message =
  //       err?.error?.message || err?.error?.error || "Approval failed";

  //     this.snackbar.show(message, false);

  //     this.removeFromPendingListsByTx(t);

  //     const failedTx = {
  //       ...t,
  //       status: "failed",
  //     };

  //     if (t.type === "payout") {
  //       this.recentpayouts.unshift(failedTx);
  //     } else {
  //       this.recentpayins.unshift(failedTx);
  //     }

  //     this.computeStatsFromData();
  //     this.updateChartsFromData();
  //     this.clampPages();
  //     this.ensureProcessingTimerState();

  //     this.confirmTransaction = null;
  //     this.showApproveConfirm = false;
  //     this.selectedTransaction = null;
  //     this.selectedFile = null;

  //     this.resetRejectReason();
  //     this.refreshCachedLists();

  //     this.loaderService.hideButtonLoader();
  //   }
  // }

  async approveTransaction(transaction: any): Promise<void> {
    if (!transaction) return;

    this.loaderService.showButtonLoader();

    const t = this.normalizeTransaction(transaction) || transaction;

    const fundId =
      t.fundId ||
      t.id ||
      (t.raw && (t.raw.id || t.raw._id || t.raw.fundId)) ||
      null;

    try {
      if (t.type === "payout") {
        // optional selection — bina select kiye bhi approve chalega
        const accountId = this.selectedPayoutInventory?.accountId || null;

        const formData = new FormData();

        if (accountId) {
          formData.append("accountId", String(accountId));
        }

        if (this.selectedFile) {
          formData.append("file", this.selectedFile, this.selectedFile.name);
        }

        await lastValueFrom(this.fundService.acceptPayout(fundId, formData));
      } else if (t.mode === "upi") {
        await lastValueFrom(this.fundService.settleUpiFund(fundId));
      } else if (t.mode === "bank") {
        await lastValueFrom(this.fundService.settleBankFund(fundId));
      } else if (t.mode === "crypto") {
        await lastValueFrom(this.fundService.settleCryptoFund(fundId));
      } else {
        this.snackbar.show("Unknown transaction type, cannot approve", false);
        this.loaderService.hideButtonLoader();
        return;
      }

      this.snackbar.show("Transaction approved successfully", true);

      this.removeFromPendingListsByTx(t);

      const approvedTx = {
        ...t,
        status: "completed",
        settled: true,
        date: t.date instanceof Date ? t.date : new Date(t.date),
      };

      if (approvedTx.type === "payout") {
        this.addApprovedUnique(this.approvedTransactions, approvedTx);
        this.addApprovedUnique(this.approvedpayouts, approvedTx);
        this.recentpayouts = [...this.approvedpayouts];
      } else {
        this.addApprovedUnique(this.approvedTransactions, approvedTx);
        this.addApprovedUnique(this.approvedpayins, approvedTx);
        this.recentpayins = [...this.approvedpayins];
      }

      this.confirmTransaction = null;
      this.showApproveConfirm = false;
      this.selectedTransaction = null;
      this.selectedFile = null;

      // payout inventory state bhi reset karo
      this.selectedPayoutInventory = null;
      this.payoutInventoryOptions = [];
      this.loadingPayoutInventory = false;
      this.payoutDropdownOpen = false; // yeh line add

      this.resetRejectReason();

      this.computeStatsFromData();
      this.updateChartsFromData();
      this.clampPages();
      this.ensureProcessingTimerState();

      this.loaderService.hideButtonLoader();
    } catch (err: any) {
      const message =
        err?.error?.message || err?.error?.error || "Approval failed";

      this.snackbar.show(message, false);

      this.removeFromPendingListsByTx(t);

      const failedTx = {
        ...t,
        status: "failed",
      };

      if (t.type === "payout") {
        this.recentpayouts.unshift(failedTx);
      } else {
        this.recentpayins.unshift(failedTx);
      }

      this.computeStatsFromData();
      this.updateChartsFromData();
      this.clampPages();
      this.ensureProcessingTimerState();

      this.confirmTransaction = null;
      this.showApproveConfirm = false;
      this.selectedTransaction = null;
      this.selectedFile = null;

      // payout inventory state bhi reset karo (error case me bhi)
      this.selectedPayoutInventory = null;
      this.payoutInventoryOptions = [];
      this.loadingPayoutInventory = false;

      this.resetRejectReason();
      this.refreshCachedLists();

      this.loaderService.hideButtonLoader();
    }
  }
  openEditAmountPopup(): void {
    this.editAmountData = {
      newAmount:
        this.selectedTransaction.mode === "crypto"
          ? this.selectedTransaction.currencyWiseAmount
          : this.selectedTransaction.amount,
      message: "",
      file: null,
      isDragging: false,
    };
    this.showEditAmountPopup = true;
  }

  closeEditAmountPopup(): void {
    this.showEditAmountPopup = false;
    this.resetEditAmountData();
  }
  maskWalletAddress(address: string | null | undefined): string {
    if (!address) return "—";
    if (address.length <= 8) return address;

    const first = address.slice(0, 4);
    const last = address.slice(-4);

    return `${first}....${last}`;
  }

  saveEditedAmount(): void {
    if (!this.editAmountData.newAmount || this.editAmountData.newAmount <= 0) {
      return;
    }

    this.loaderService.showButtonLoader();

    const updateData = {
      fundId: this.selectedTransaction.id,
      oldAmount:
        this.selectedTransaction.mode === "crypto"
          ? this.selectedTransaction.currencyWiseAmount
          : this.selectedTransaction.amount,
      amount: this.editAmountData.newAmount,
      reason: this.editAmountData.message,
      timestamp: new Date().toISOString(),
      updatedBy: this.entityId,
    };

    this.fundService
      .updateAmount(updateData, this.editAmountData.file)
      .subscribe({
        next: (res) => {
          this.loaderService.hideButtonLoader();
        },
        error: (err) => {
          this.loaderService.hideButtonLoader();
          this.snackbar.show(
            err?.error?.message || "Failed to update amount",
            false,
          );
        },
      });

    if (this.selectedTransaction.mode === "crypto") {
      this.selectedTransaction.currencyWiseAmount =
        this.editAmountData.newAmount;
    } else {
      this.selectedTransaction.amount = this.editAmountData.newAmount;
    }

    this.closeEditAmountPopup();
  }

  onProcessingClick(transaction: any) {
    if (!transaction?.id) return;
    if (transaction._apiPending) return;

    const label = this.getRemainingTimeLabel(transaction);
    if (transaction.processing && label !== "Process") return;

    transaction._apiPending = true;
    this.loaderService.showButtonLoader();

    this.fundService
      .updateProcessingStatus(transaction.id, this.entityId, this.role)
      .subscribe({
        next: (res: any) => {
          transaction._apiPending = false;

          const rawLimit =
            res?.processingTimeLimit ?? res?.data?.processingTimeLimit ?? null;

          if (rawLimit) {
            const deadline = new Date(rawLimit);
            const now = Date.now();

            if (!isNaN(deadline.getTime()) && deadline.getTime() > now) {
              transaction.processing = true;
              transaction.processingTimeLimit = rawLimit;
              transaction.processingStartedAt = new Date();

              this.processingNow = now;

              this.ensureProcessingTimerState();

              this.snackbar.show(res.message || "Processing started", true);
            } else {
              transaction.processing = false;
              transaction.processingTimeLimit = null;
              this.snackbar.show("Processing time already expired", false);
            }
          } else {
            transaction.processing = true;
            this.ensureProcessingTimerState();
          }

          this.refreshCachedLists();
          this.loaderService.hideButtonLoader();
        },
        error: (err) => {
          transaction._apiPending = false;
          transaction.processing = false;
          transaction.processingTimeLimit = null;
          const message =
            err?.error?.message || err?.error?.error || "Processing failed";
          this.snackbar.show(message, false);
          this.ensureProcessingTimerState();
          this.loaderService.hideButtonLoader();
        },
      });
  }

  private startProcessingTimer(): void {
    if (this.processingTimerId) return;
    this.startSlabTimer();

    this.processingNow = Date.now();

    this.processingTimerId = window.setInterval(() => {
      this.processingNow = Date.now();

      this.updateAllSlabPercentages();
    }, 1000);
  }

  private stopProcessingTimer(): void {
    if (this.processingTimerId) {
      clearInterval(this.processingTimerId);
      this.processingTimerId = null;
    }
  }

  private ensureProcessingTimerState(): void {
    if (!this.processingTimerId) {
      this.startSlabTimer();
    }
  }

  resetEditAmountData(): void {
    this.editAmountData = {
      newAmount: 0,
      message: "",
      file: null,
      isDragging: false,
    };

    const fileInput = document.getElementById(
      "editFileInput",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  onEditDragOver(event: DragEvent): void {
    event.preventDefault();
    this.editAmountData.isDragging = true;
  }

  onEditDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.editAmountData.isDragging = false;
  }

  onEditFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.editAmountData.isDragging = false;

    if (event.dataTransfer?.files.length) {
      const file = event.dataTransfer.files[0];
      this.validateAndSetEditFile(file);
    }
  }

  onEditFileSelected(event: any): void {
    const file = event.target.files[0];
    this.validateAndSetEditFile(file);
  }

  validateAndSetEditFile(file: File): void {
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return;
    }

    this.editAmountData.file = file;
  }

  removeEditFile(): void {
    this.editAmountData.file = null;
    const fileInput = document.getElementById(
      "editFileInput",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }
  async rejectTransaction(
    transaction: any,
    reason: any,
    file?: File | null,
  ): Promise<void> {
    if (!transaction) return;

    this.loaderService.showButtonLoader();

    const t = this.normalizeTransaction(transaction) || transaction;
    const fundId =
      t.fundId ||
      t.id ||
      (t.raw && (t.raw.id || t.raw._id || t.raw.fundId)) ||
      null;

    try {
      let rejectObservable;

      if (t.type === "payout") {
        rejectObservable = this.fundService.rejectpayout(fundId, reason, file);
      } else if (t.mode === "upi" || t.type === "upi") {
        rejectObservable = this.fundService.rejectUpiFund(fundId, reason, file);
      } else if (t.mode === "bank" || t.type === "bank") {
        rejectObservable = this.fundService.rejectBankFund(
          fundId,
          reason,
          file,
        );
      } else if (t.mode === "crypto") {
        rejectObservable = this.fundService.rejectCryptoFund(
          fundId,
          reason,
          file,
        );
      } else {
        this.snackbar.show("Unknown transaction type, cannot reject", false);
        this.loaderService.hideButtonLoader();
        return;
      }

      await lastValueFrom(rejectObservable);
      this.snackbar.show("Transaction rejected successfully", true);

      this.removeFromPendingListsByTx(t);

      const failedTx = { ...t, status: "failed" };
      if (t.type === "payout") {
        if (
          !this.recentpayouts.some((x) => this.identifiersMatch(x, failedTx))
        ) {
          this.recentpayouts.unshift(failedTx);
        }
        this.approvedpayouts = this.approvedpayouts.filter(
          (x) => !this.identifiersMatch(x, failedTx),
        );
      } else {
        if (
          !this.recentpayins.some((x) => this.identifiersMatch(x, failedTx))
        ) {
          this.recentpayins.unshift(failedTx);
        }
        this.approvedpayins = this.approvedpayins.filter(
          (x) => !this.identifiersMatch(x, failedTx),
        );
      }

      this.confirmTransaction = null;
      this.showRejectConfirm = false;
      this.selectedTransaction = null;
      this.resetRejectReason();

      this.computeStatsFromData();
      this.updateChartsFromData();
      this.clampPages();
      this.ensureProcessingTimerState();
    } catch (err: any) {
      const message =
        err?.error?.message || err?.error?.error || "Rejection failed";
      this.snackbar.show(message, false);

      this.removeFromPendingListsByTx(t);

      this.confirmTransaction = null;
      this.showRejectConfirm = false;
      this.selectedTransaction = null;
      this.resetRejectReason();
    } finally {
      this.resetForm();
      this.refreshCachedLists();
      this.loaderService.hideButtonLoader();
    }
  }

  // openApproveConfirm(transaction: any) {
  //   if (!transaction) return;

  //   if (transaction.type === "payout" && transaction.processing !== true) {
  //     this.snackbar.show("Please start processing first", false);
  //     return;
  //   }

  //   const portalId = transaction.raw?.portalId;

  //   const t = this.normalizeTransaction(transaction) || transaction;
  //   const src =
  //     t.type === "payout"
  //       ? "payout"
  //       : t.mode === "upi"
  //         ? "upi"
  //         : t.mode === "bank"
  //           ? "bank"
  //           : t.mode === "crypto"
  //             ? "crypto"
  //             : "none";

  //   this.confirmTransaction = { ...t, section: src };
  //   this.showApproveConfirm = true;
  //   this.selectedPayoutMethod = "upi";
  //   this.selectedUpi = null;
  //   this.selectedBank = null;
  //   this.customReason = "";
  // }
  openApproveConfirm(transaction: any) {
    if (!transaction) return;

    if (transaction.type === "payout" && transaction.processing !== true) {
      this.snackbar.show("Please start processing first", false);
      return;
    }

    const portalId = transaction.raw?.portalId;

    const t = this.normalizeTransaction(transaction) || transaction;
    const src =
      t.type === "payout"
        ? "payout"
        : t.mode === "upi"
          ? "upi"
          : t.mode === "bank"
            ? "bank"
            : t.mode === "crypto"
              ? "crypto"
              : "none";

    this.confirmTransaction = { ...t, section: src };
    this.showApproveConfirm = true;

    this.selectedPayoutInventory = null;
    this.payoutInventoryOptions = [];
    this.loadingPayoutInventory = false;
    this.payoutDropdownOpen = false; // yeh line add
    this.customReason = "";

    // sirf payout ke case me hi inventory dropdown load hoga
    if (t.type === "payout") {
      const payoutMode = t.raw?.mode || t.raw?.paymentMethod || null;
      if (payoutMode) {
        this.fetchPayoutInventory(payoutMode);
      }
    }
  }
  openRejectConfirm(tx: any) {
    if (!tx) return;

    if (tx.type === "payout" && tx.processing !== true) {
      this.snackbar.show("Please start processing first", false);
      return;
    }

    const t = this.normalizeTransaction(tx) || tx;
    const src =
      t.type === "payout"
        ? "payout"
        : t.mode === "upi"
          ? "upi"
          : t.mode === "bank"
            ? "bank"
            : t.mode === "crypto"
              ? "crypto"
              : "none";

    this.confirmTransaction = { ...t, section: src };
    this.showRejectConfirm = true;
    this.selectedFile = null;
    this.previewUrl = null;
    this.previewDocument = false;
    this.isDragging = false;

    this.resetRejectReason();
  }

  async confirmApprove() {
    if (this.isApproving) return;
    this.isApproving = true;
    try {
      if (this.isPayoutActionBlocked(this.confirmTransaction)) {
        this.snackbar.show("You Can approve After Processing", false);
        return;
      }

      if (!this.confirmTransaction) return;

      if (this.confirmTransaction.type === "payout" && !this.selectedFile) {
        this.snackbar.show("Attachment is required for payout approval", false);
        return;
      }

      await this.approveTransaction(this.confirmTransaction);
    } finally {
      this.isApproving = false;
    }
  }

  get rejectionReason(): string {
    return this.reason || "";
  }

  isAttachmentRequired(): boolean {
    if (!this.confirmTransaction) return false;

    if (this.showRejectConfirm && this.confirmTransaction.type === "payin") {
      return true;
    }

    if (this.showApproveConfirm && this.confirmTransaction.type === "payout") {
      return true;
    }

    return false;
  }

  showAttachmentField(): boolean {
    if (!this.confirmTransaction) return true;

    if (this.showRejectConfirm && this.confirmTransaction.type === "payout") {
      return false;
    }

    return true;
  }

  async confirmReject() {
    if (this.isRejecting) return;

    this.isRejecting = true;

    try {
      if (!this.confirmTransaction) return;

      if (this.isPayoutActionBlocked(this.confirmTransaction)) {
        this.snackbar.show("You can Approve after Processing", false);
        return;
      }

      if (this.confirmTransaction.type !== "payout" && !this.selectedFile) {
        this.snackbar.show("Please upload attachment before rejecting", false);
        return;
      }

      const finalReason =
        this.reason === "OTHER" ? this.customReason.trim() : this.reason;

      if (!finalReason) {
        this.snackbar.show("Please select a reason for rejection", false);
        return;
      }
      if (this.reason === "OTHER" && !this.customReason.trim()) {
        this.snackbar.show("Please enter rejection reason", false);
        return;
      }

      await this.rejectTransaction(
        this.confirmTransaction,
        finalReason,
        this.selectedFile ?? undefined,
      );

      this.confirmTransaction = null;
      this.showRejectConfirm = false;
      this.resetForm();
    } finally {
      this.isRejecting = false;
    }
  }

  resetForm(): void {
    this.reason = "";

    this.selectedFile = null;
    this.isDragging = false;
    this.showRejectConfirm = false;

    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  cancelApprove() {
    this.showApproveConfirm = false;
    this.confirmTransaction = null;
    this.showApproveConfirm = false;

    this.selectedPayoutInventory = null;
    this.payoutInventoryOptions = [];
    this.loadingPayoutInventory = false;
    this.payoutDropdownOpen = false; // yeh line add

    if (this.showRejectConfirm === true) {
      this.showRejectConfirm = false;
    }
    this.resetRejectReason();
  }
  togglepayin(): void {
    this.payinActive = !this.payinActive;
  }

  togglepayout(): void {
    this.payoutActive = !this.payoutActive;
  }

  getActiveSmallLabel(
    active: boolean,
    type: "payin" | "payout",
  ): {
    label: string;
    classes: string;
  } {
    if (type === "payin") {
      return active
        ? {
            label: "Active",
            classes:
              "text-emerald-600 bg-emerald-100 border border-emerald-200",
          }
        : {
            label: "Inactive",
            classes: "text-slate-500 bg-slate-100 border border-slate-200",
          };
    } else {
      return active
        ? {
            label: "Active",
            classes: "text-rose-600 bg-rose-100 border border-rose-200",
          }
        : {
            label: "Inactive",
            classes: "text-slate-500 bg-slate-100 border border-slate-200",
          };
    }
  }

  openTransaction(transaction: any) {
    this.selectedTransaction = transaction;

    if (
      transaction.filePath &&
      !transaction.fileUrl &&
      !transaction.imageLoading
    ) {
      transaction.imageLoading = true;

      this.multimediaService.getPrivateImage(transaction.filePath).subscribe({
        next: (url) => {
          transaction.fileUrl = url;
          transaction.imageLoading = false;
        },
        error: () => {
          transaction.imageLoading = false;
          transaction.fileUrl = "";
        },
      });
    }

    if (
      transaction.rejectionPath &&
      !transaction.rejectionUrl &&
      !transaction.rejectionLoading
    ) {
      transaction.rejectionLoading = true;

      this.multimediaService
        .getPrivateImage(transaction.rejectionPath)
        .subscribe({
          next: (url) => {
            transaction.rejectionUrl = url;
            transaction.rejectionLoading = false;
          },
          error: () => {
            transaction.rejectionLoading = false;
            transaction.rejectionUrl = "";
          },
        });
    }
  }

  private normalizeIncomingFund(
    fund: any,
    guessedMode?: "bank" | "upi" | "payout" | "crypto",
  ) {
    if (!fund) return null;
    const mode = guessedMode
      ? guessedMode
      : fund.type === "payout" ||
          fund.transactionType === "payout" ||
          fund.reviewStatus === "WITHDRAWAL"
        ? "payout"
        : this.isCryptoType(fund.type)
          ? "crypto"
          : fund.type === "bank" || fund.bankId || fund.accountNo
            ? "bank"
            : fund.type === "upi" || fund.vpa
              ? "upi"
              : "bank";
    const filePathRaw = fund.filePath || fund.snapshot || fund.qrImage || null;

    let parsedDate: Date;

    if (fund.createdAt) {
      parsedDate = new Date(String(fund.createdAt));
    } else if (fund.dateTime) {
      parsedDate = new Date(String(fund.dateTime));
    } else if (fund.updatedAt) {
      parsedDate = new Date(String(fund.updatedAt));
    } else {
      parsedDate = new Date();
    }

    if (isNaN(parsedDate.getTime())) {
      parsedDate = new Date();
    }

    return {
      id: fund.id || fund._id || null,
      fundId: fund.id || fund.fundId || fund._id || null,

      type: fund.type,

      fundtype: fund.fundtype,

      portal: fund.portalName || fund.portalDomain || fund.portalId || null,

      currency: fund.currency,
      currencyRate: fund.currencyRate,
      rate: fund.rate || 1,

      amount: Number(fund.amount) || 0,
      currencyWiseAmount: Number(fund.currencyWiseAmount) || 0,

      date: parsedDate,

      utrNumber: fund.transactionId || fund.utr || null,

      utrEdited: fund.utrEdited,

      parentCurrency: fund.parentCurrency,

      mode,

      accountNo: fund.accountNo || fund.accountNumber || null,

      bankId: fund.bankId || null,

      bankName: fund.bankName || fund.bank || fund.bank_name || null,

      filePath: filePathRaw,
      fileUrl: null,
      imageLoading: false,

      rejectionPath: fund.rejectionFilePath || null,

      rejectionUrl: null,
      rejectionLoading: false,

      remarks: fund.remarks || fund.message || null,

      settled: !!fund.settled,

      raw: fund,

      processing: fund.processing,

      upiId: fund.vpa || fund.upiId || null,

      holderName: fund.bankAccountHolderName || fund.holder || null,
      holder: fund.holder || null,

      ifscCode: fund.ifsc || fund.raw?.ifsc || null,

      fundDisplayId: fund.displayId,

      ftt: !!fund.firstPayin,
      existsInPayinFunds: fund.existsInPayinFunds ?? 0,
      userId: fund.userId || null,
    };
  }

  private normalizeTransaction(tx: any) {
    if (!tx) return tx;

    if (tx.mode && tx.date instanceof Date) return tx;

    if (tx.raw) return this.normalizeIncomingFund(tx.raw);
    return this.normalizeIncomingFund(tx);
  }

  // private processIncomingEvent(data: any) {
  //   if (!data) return;

  //   if (!this.dynamicPayinConfig && data?.DYNAMIC_PAYIN_TIME) {
  //     this.dynamicPayinConfig = structuredClone(data.DYNAMIC_PAYIN_TIME);
  //     this.latestDynamicPayin = this.dynamicPayinConfig;
  //   }
  //   if (!this.dynamicPayoutConfig && data?.DYNAMIC_PAYOUT_TIME) {
  //     this.dynamicPayoutConfig = structuredClone(data.DYNAMIC_PAYOUT_TIME);
  //     this.latestDynamicPayout = this.dynamicPayoutConfig;
  //   }

  //   const dynamicPayin = this.dynamicPayinConfig;
  //   const dynamicPayout = this.dynamicPayoutConfig;

  //   const now = Date.now();

  //   if (Array.isArray(data.PENDING_PAYIN)) {
  //     const upiList: any[] = [];
  //     const bankList: any[] = [];
  //     const cryptoList: any[] = [];

  //     for (const f of data.PENDING_PAYIN) {
  //       const rawType = (f.type || "").toUpperCase();

  //       const existing =
  //         this.pendingUpi.find(
  //           (x: any) => x.id === f.id || x.fundId === f.id,
  //         ) ||
  //         this.pendingBank.find(
  //           (x: any) => x.id === f.id || x.fundId === f.id,
  //         ) ||
  //         this.pendingCrypto.find(
  //           (x: any) => x.id === f.id || x.fundId === f.id,
  //         );

  //       let mode: "upi" | "bank" | "crypto";
  //       if (this.isCryptoType(rawType)) mode = "crypto";
  //       else if (rawType === "UPI") mode = "upi";
  //       else mode = "bank";

  //       const tx = this.normalizeIncomingFund(
  //         {
  //           ...existing,
  //           ...f,
  //           processing: existing?.processing ?? f?.processing ?? false,
  //         },
  //         mode,
  //       );
  //       if (!tx) continue;

  //       const slab = dynamicPayin?.timeRanges?.length
  //         ? this.getPayinSlabInfo(tx, dynamicPayin, now)
  //         : null;

  //       const finalTx = {
  //         ...tx,
  //         slabPercentage:
  //           slab !== null ? slab.percentage : (existing?.slabPercentage ?? 100),
  //         slabEligible:
  //           slab !== null ? slab.eligible : (existing?.slabEligible ?? true),
  //         timePassed:
  //           slab !== null ? slab.diffMinutes : (existing?.timePassed ?? 0),
  //         cryptoType: this.isCryptoType(rawType) ? rawType : null,
  //       };

  //       if (mode === "crypto") cryptoList.push(finalTx);
  //       else if (mode === "upi") upiList.push(finalTx);
  //       else bankList.push(finalTx);
  //     }

  //     this.pendingUpi = upiList;
  //     this.pendingBank = bankList;
  //     this.pendingCrypto = cryptoList;
  //   }

  //   if (Array.isArray(data.PENDING_PAYOUT)) {
  //     this.pendingpayouts = data.PENDING_PAYOUT.map((f: any) => {
  //       const existing = this.pendingpayouts.find(
  //         (x: any) =>
  //           x.id === f.id || x.fundId === f.id || x.fundId === f.fundId,
  //       );

  //       // const tx = this.normalizeIncomingFund(
  //       //   {
  //       //     ...existing,
  //       //     ...f,

  //       //     processing: existing?.processing === true ? true : !!f?.processing,

  //       //     processingTimeLimit:
  //       //       f?.processingTimeLimit ?? existing?.processingTimeLimit ?? null,
  //       //   },
  //       //   "payout",
  //       // );

  //       const incomingProcessing = f?.processing === true;
  //       const localProcessing = existing?.processing === true;
  //       const isProcessing = incomingProcessing || localProcessing;

  //       const tx = this.normalizeIncomingFund(
  //         {
  //           ...existing,
  //           ...f,

  //           processing: isProcessing,

  //           processingTimeLimit: isProcessing
  //             ? (f?.processingTimeLimit ??
  //               existing?.processingTimeLimit ??
  //               null)
  //             : null,
  //         },
  //         "payout",
  //       );

  //       if (!tx) return null;

  //       const slab = dynamicPayout?.amountRanges?.length
  //         ? this.getPayoutSlabInfo(tx, dynamicPayout, now)
  //         : null;

  //       return {
  //         ...tx,
  //         slabPercentage:
  //           slab !== null ? slab.percentage : (existing?.slabPercentage ?? 100),
  //         slabEligible:
  //           slab !== null ? slab.eligible : (existing?.slabEligible ?? true),
  //         timePassed:
  //           slab !== null ? slab.diffMinutes : (existing?.timePassed ?? 0),
  //       };
  //     }).filter(Boolean);

  //     this.refreshCachedLists();
  //   }

  //   this.pendingUpi = [...this.pendingUpi];
  //   this.pendingBank = [...this.pendingBank];
  //   this.pendingCrypto = [...this.pendingCrypto];
  //   this.pendingpayouts = [...this.pendingpayouts];

  //   this.computeStatsFromData();
  //   this.updateChartsFromData();
  //   this.clampPages();
  //   this.ensureProcessingTimerState();
  // }
  private processIncomingEvent(data: any) {
    if (!data) return;

    if (!this.dynamicPayinConfig && data?.DYNAMIC_PAYIN_TIME) {
      this.dynamicPayinConfig = structuredClone(data.DYNAMIC_PAYIN_TIME);
      this.latestDynamicPayin = this.dynamicPayinConfig;
    }
    if (!this.dynamicPayoutConfig && data?.DYNAMIC_PAYOUT_TIME) {
      this.dynamicPayoutConfig = structuredClone(data.DYNAMIC_PAYOUT_TIME);
      this.latestDynamicPayout = this.dynamicPayoutConfig;
    }

    const dynamicPayin = this.dynamicPayinConfig;
    const dynamicPayout = this.dynamicPayoutConfig;

    const now = Date.now();

    if (Array.isArray(data.PENDING_PAYIN)) {
      const upiList: any[] = [];
      const bankList: any[] = [];
      const cryptoList: any[] = [];

      for (const f of data.PENDING_PAYIN) {
        const rawType = (f.type || "").toUpperCase();

        const existing =
          this.pendingUpi.find(
            (x: any) => x.id === f.id || x.fundId === f.id,
          ) ||
          this.pendingBank.find(
            (x: any) => x.id === f.id || x.fundId === f.id,
          ) ||
          this.pendingCrypto.find(
            (x: any) => x.id === f.id || x.fundId === f.id,
          );

        let mode: "upi" | "bank" | "crypto";
        if (this.isCryptoType(rawType)) mode = "crypto";
        else if (rawType === "UPI") mode = "upi";
        else mode = "bank";

        const tx = this.normalizeIncomingFund(
          {
            ...existing,
            ...f,
            processing: existing?.processing ?? f?.processing ?? false,
          },
          mode,
        );
        if (!tx) continue;

        const slab = dynamicPayin?.timeRanges?.length
          ? this.getPayinSlabInfo(tx, dynamicPayin, now)
          : null;

        const finalTx = {
          ...tx,
          slabPercentage:
            slab !== null ? slab.percentage : (existing?.slabPercentage ?? 100),
          slabEligible:
            slab !== null ? slab.eligible : (existing?.slabEligible ?? true),
          timePassed:
            slab !== null ? slab.diffMinutes : (existing?.timePassed ?? 0),
          cryptoType: this.isCryptoType(rawType) ? rawType : null,
        };

        if (mode === "crypto") cryptoList.push(finalTx);
        else if (mode === "upi") upiList.push(finalTx);
        else bankList.push(finalTx);
      }

      this.pendingUpi = upiList;
      this.pendingBank = bankList;
      this.pendingCrypto = cryptoList;
    }

    if (Array.isArray(data.PENDING_PAYOUT)) {
      this.pendingpayouts = data.PENDING_PAYOUT.map((f: any) => {
        const existing = this.pendingpayouts.find(
          (x: any) =>
            x.id === f.id || x.fundId === f.id || x.fundId === f.fundId,
        );

        const incomingProcessing = f?.processing === true;
        const localProcessing = existing?.processing === true;
        const isProcessing = incomingProcessing || localProcessing;

        const tx = this.normalizeIncomingFund(
          {
            ...existing,
            ...f,

            processing: isProcessing,

            processingTimeLimit: isProcessing
              ? (f?.processingTimeLimit ??
                existing?.processingTimeLimit ??
                null)
              : null,
          },
          "payout",
        );

        if (!tx) return null;

        const slab = dynamicPayout?.amountRanges?.length
          ? this.getPayoutSlabInfo(tx, dynamicPayout, now)
          : null;

        return {
          ...tx,
          slabPercentage:
            slab !== null ? slab.percentage : (existing?.slabPercentage ?? 100),
          slabEligible:
            slab !== null ? slab.eligible : (existing?.slabEligible ?? true),
          timePassed:
            slab !== null ? slab.diffMinutes : (existing?.timePassed ?? 0),
        };
      }).filter(Boolean);

      this.attachExistsInPayoutFunds();

      this.refreshCachedLists();
    }

    this.pendingUpi = [...this.pendingUpi];
    this.pendingBank = [...this.pendingBank];
    this.pendingCrypto = [...this.pendingCrypto];
    this.pendingpayouts = [...this.pendingpayouts];

    this.computeStatsFromData();
    this.updateChartsFromData();
    this.clampPages();
    this.ensureProcessingTimerState();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
    ];

    // Android/iOS ke kuch camera apps blank type bhejte hain — extension se fallback check
    const nameLower = (file.name || "").toLowerCase();
    const looksLikeImage = /\.(jpg|jpeg|png)$/.test(nameLower);
    const looksLikePdf = /\.pdf$/.test(nameLower);

    if (!allowedTypes.includes(file.type) && !looksLikeImage && !looksLikePdf) {
      this.snackbar.show("Only image and PDF files are allowed", false);
      return;
    }

    const isPdf = file.type === "application/pdf" || looksLikePdf;
    const maxPdfSize = 1 * 1024 * 1024; // 1MB
    const maxImageSize = 3 * 1024 * 1024; // 3MB — camera photo isse zyada ho toh compress karenge

    if (isPdf && file.size > maxPdfSize) {
      this.snackbar.show("PDF size must be less than 1 MB", false);
      return;
    }

    if (!isPdf) {
      if (file.size > maxImageSize) {
        // compress karke upload karo, seedha reject mat karo
        this.compressImage(file, maxImageSize)
          .then((compressed) => {
            this.selectedFile = compressed;
            this.previewDocument = false;
            this.previewUrl = URL.createObjectURL(compressed);
          })
          .catch(() => {
            this.snackbar.show(
              "Image too large, please retake with lower quality",
              false,
            );
          });
        return;
      }
      this.previewDocument = false;
      this.previewUrl = URL.createObjectURL(file);
      this.selectedFile = file;
      return;
    }

    this.previewDocument = true;
    this.previewUrl = URL.createObjectURL(file);
    this.selectedFile = file;
  }

  // naya helper — canvas se image compress karta hai
  private compressImage(file: File, maxSizeBytes: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e: any) => {
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          const maxDim = 1600; // max width/height, quality ke liye kaafi hai
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("no canvas context");
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.8;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) return reject("compression failed");
                if (blob.size > maxSizeBytes && quality > 0.3) {
                  quality -= 0.1;
                  tryCompress();
                  return;
                }
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              },
              "image/jpeg",
              quality,
            );
          };
          tryCompress();
        };
        img.onerror = () => reject("image load failed");
      };
      reader.onerror = () => reject("file read failed");
      reader.readAsDataURL(file);
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    if (event.dataTransfer?.files.length) {
      const file = event.dataTransfer.files[0];
      this.validateAndSetFile(file);
    }
  }

  validateAndSetFile(file: File): void {
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return;
    }

    this.selectedFile = file;
  }

  removeFile(): void {
    this.selectedFile = null;

    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  getAllTransactions() {
    return [
      ...(this.filteredPendingUpi?.() || []),
      ...(this.filteredPendingBank?.() || []),
      ...(this.filteredPendingCrypto?.() || []),
      ...(this.filteredPendingpayouts?.() || []),
    ];
  }

  getFilteredMobileTransactions() {
    const allTransactions = this.getAllTransactions();

    if (this.mobileFilter === "all") return allTransactions;
    if (this.mobileFilter === "upi") return this.filteredPendingUpi?.() || [];
    if (this.mobileFilter === "bank") return this.filteredPendingBank?.() || [];
    if (this.mobileFilter === "crypto")
      return this.filteredPendingCrypto?.() || [];
    if (this.mobileFilter === "payout")
      return this.filteredPendingpayouts?.() || [];

    return allTransactions;
  }

  onProcessingClickMobile(event: Event, transaction: any) {
    event.stopPropagation();
    this.onProcessingClick(transaction);
  }

  getMobileTransactions(): any[] {
    return this.getFilteredMobileTransactions();
  }

  getPagedMobileTransactions(): any[] {
    const list = this.getMobileTransactions();
    const start = (this.mobilePage - 1) * this.mobilePageSize;
    return list.slice(start, start + this.mobilePageSize);
  }

  mobileTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.getMobileTransactions().length / this.mobilePageSize),
    );
  }

  setMobilePage(p: number) {
    this.mobilePage = Math.min(Math.max(1, p), this.mobileTotalPages());
  }

  onChangeMobilePageSize(size: number) {
    this.mobilePageSize = size;
    this.mobilePage = 1;
  }
  openDocumentPreview(url: string): void {
    this.previewUrl = url;
    this.previewDocument = true;
  }

  closeDocumentPreview(): void {
    this.previewDocument = false;
    this.previewUrl = null;
  }

  openImagePopup(url: string): void {
    this.popupImageUrl = url;
    this.previewImage = url;
    this.showImagePopup = true;
  }

  closeImagePopup(): void {
    this.showImagePopup = false;
    this.popupImageUrl = null;
  }

  reloadDashboard(): void {
    if (this.lastBroadcastData) {
      this.processIncomingEvent(this.lastBroadcastData);
    }

    this.computeStatsFromData();
    this.updateChartsFromData();
    this.clampPages();

    this.snackbar.show("Dashboard refreshed", true, 800);
  }

  previewImage: string | null = null;

  getTimeAgo(date: Date | string): string {
    if (!date) return "";

    const now = new Date().getTime();
    const inputTime = new Date(date).getTime();

    let diff = Math.floor((now - inputTime) / 1000);

    const days = Math.floor(diff / (24 * 3600));
    diff %= 24 * 3600;

    const hours = Math.floor(diff / 3600);
    diff %= 3600;

    const minutes = Math.floor(diff / 60);

    let result = "";

    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;

    return result.trim() || "Just now";
  }

  getTransactionLabel(tx: any): string {
    if (tx.type === "payout") return "Payout";
    if (tx.fundtype === "UPI") return "UPI";
    return "Bank";
  }

  getTxKind(tx: any): "UPI" | "Bank" | "Payout" {
    if (tx.type === "payout") return "Payout";
    return (tx.fundtype || "").toUpperCase() === "UPI" ? "UPI" : "Bank";
  }

  getTxAccountLabel(tx: any): string {
    if ((tx.fundtype || "").toUpperCase() === "UPI") {
      return tx.upiId || tx.vpa || "—";
    }
    return tx.accountNo || tx.bankAccountHolderName || "—";
  }

  getPayinSlabInfo(transaction: any, dynamicConfig: any, now: number) {
    const txDate =
      transaction?.dateTime ||
      transaction?.date ||
      transaction?.createdAt ||
      transaction?.raw?.createdAt ||
      transaction?.raw?.dateTime ||
      transaction?.raw?.date;

    if (!txDate) {
      return null;
    }

    const createdTime = new Date(txDate).getTime();

    if (isNaN(createdTime)) {
      return null;
    }

    const diffMinutes = Math.floor((now - createdTime) / 60000);

    const ranges = [...(dynamicConfig?.timeRanges || [])].sort(
      (a: any, b: any) => {
        const aMax =
          a.isUpto === true
            ? Infinity
            : a.maxMinutes === 0
              ? Infinity
              : Number(a.maxMinutes);
        const bMax =
          b.isUpto === true
            ? Infinity
            : b.maxMinutes === 0
              ? Infinity
              : Number(b.maxMinutes);
        return aMax - bMax;
      },
    );

    if (!ranges.length) {
      return {
        percentage: 100,
        eligible: true,
        diffMinutes,
      };
    }

    let prevMax = 0;

    for (const range of ranges) {
      if (range.isUpto === true) {
        return {
          percentage: Number(range.percentage ?? 100),
          eligible: true,
          diffMinutes,
        };
      }

      const max = range.maxMinutes === 0 ? Infinity : Number(range.maxMinutes);

      if (diffMinutes >= prevMax && diffMinutes < max) {
        return {
          percentage: Number(range.percentage ?? 100),
          eligible: true,
          diffMinutes,
        };
      }

      prevMax = max;
    }

    return {
      percentage: 0,
      eligible: false,
      diffMinutes,
    };
  }

  getPayoutSlabInfo(transaction: any, dynamicConfig: any, now: number) {
    const txDate =
      transaction?.dateTime || transaction?.date || transaction?.createdAt;

    if (!txDate) {
      return {
        percentage: 0,
        eligible: false,
        diffMinutes: 0,
      };
    }

    const safeDate = txDate instanceof Date ? txDate : new Date(String(txDate));

    if (isNaN(safeDate.getTime())) {
      return {
        percentage: 0,
        eligible: false,
        diffMinutes: 0,
      };
    }

    const createdTime = safeDate.getTime();
    const diffMinutes = Math.floor((now - createdTime) / 60000);
    const amount = Number(transaction.amount || 0);

    const amountRanges = [...(dynamicConfig?.amountRanges || [])].sort(
      (a: any, b: any) => {
        const aMax =
          a.isUpto === true
            ? Infinity
            : a.maxAmount === 0
              ? Infinity
              : Number(a.maxAmount);
        const bMax =
          b.isUpto === true
            ? Infinity
            : b.maxAmount === 0
              ? Infinity
              : Number(b.maxAmount);
        return aMax - bMax;
      },
    );

    if (!amountRanges.length) {
      return {
        percentage: 100,
        eligible: true,
        diffMinutes,
      };
    }

    let selectedAmountRange = null;

    for (const range of amountRanges) {
      if (range.isUpto === true) {
        selectedAmountRange = range;
        break;
      }

      const max = range.maxAmount === 0 ? Infinity : Number(range.maxAmount);

      if (amount <= max) {
        selectedAmountRange = range;
        break;
      }
    }

    if (!selectedAmountRange) {
      return {
        percentage: 0,
        eligible: false,
        diffMinutes,
      };
    }

    const timeRanges = [...(selectedAmountRange.timeRanges || [])].sort(
      (a: any, b: any) => {
        const aMax =
          a.isUpto === true
            ? Infinity
            : a.maxMinutes === 0
              ? Infinity
              : Number(a.maxMinutes);
        const bMax =
          b.isUpto === true
            ? Infinity
            : b.maxMinutes === 0
              ? Infinity
              : Number(b.maxMinutes);
        return aMax - bMax;
      },
    );

    if (!timeRanges.length) {
      return {
        percentage: 0,
        eligible: false,
        diffMinutes,
      };
    }

    let prevTime = 0;

    for (const t of timeRanges) {
      if (t.isUpto === true) {
        return {
          percentage: Number(t.percentage ?? 0),
          eligible: true,
          diffMinutes,
        };
      }

      const max = t.maxMinutes === 0 ? Infinity : Number(t.maxMinutes);

      if (diffMinutes >= prevTime && diffMinutes < max) {
        return {
          percentage: Number(t.percentage ?? 0),
          eligible: true,
          diffMinutes,
        };
      }

      prevTime = max;
    }

    return {
      percentage: 0,
      eligible: false,
      diffMinutes,
    };
  }
  private startRealtimeUpdates(): void {
    if (this.realtimeUpdateInterval) return;

    this.realtimeUpdateInterval = setInterval(() => {}, 1000);
  }

  private updateAllSlabPercentages(): void {
    if (!this.latestDynamicPayin && !this.latestDynamicPayout) {
      return;
    }

    const now = Date.now();

    this.pendingUpi = this.pendingUpi.map((tx: any) => {
      if (!tx?.date && !tx?.createdAt && !tx?.dateTime) {
        return tx;
      }

      const slab = this.latestDynamicPayin?.timeRanges?.length
        ? this.getPayinSlabInfo(tx, this.latestDynamicPayin, now)
        : null;

      if (!slab) return tx;

      return {
        ...tx,
        slabPercentage: slab.percentage,
        slabEligible: slab.eligible,
        timePassed: slab.diffMinutes,
      };
    });

    this.pendingBank = this.pendingBank.map((tx: any) => {
      if (!tx?.date && !tx?.createdAt && !tx?.dateTime) {
        return tx;
      }

      const slab = this.latestDynamicPayin?.timeRanges?.length
        ? this.getPayinSlabInfo(tx, this.latestDynamicPayin, now)
        : null;

      if (!slab) return tx;

      return {
        ...tx,
        slabPercentage: slab.percentage,
        slabEligible: slab.eligible,
        timePassed: slab.diffMinutes,
      };
    });
    this.pendingCrypto = this.pendingCrypto.map((tx: any) => {
      if (!tx?.date && !tx?.createdAt && !tx?.dateTime) return tx;
      const slab = this.latestDynamicPayin?.timeRanges?.length
        ? this.getPayinSlabInfo(tx, this.latestDynamicPayin, now)
        : null;
      if (!slab) return tx;
      return {
        ...tx,
        slabPercentage: slab.percentage,
        slabEligible: slab.eligible,
        timePassed: slab.diffMinutes,
      };
    });

    this.pendingpayouts = this.pendingpayouts.map((tx: any) => {
      if (tx?.processing) {
        const deadline = this.parseProcessingDeadline(tx);
        if (!deadline || deadline.getTime() <= now) {
          //  NEW: existing loadBroadcast API ko hi dobara call karo (ek baar)
          this.notifyProcessingExpired(tx);

          tx = {
            ...tx,
            processing: false,
            processingStartedAt: null,
            processingDeadline: null,
          };
        }
      }

      if (!tx?.date && !tx?.createdAt && !tx?.dateTime) {
        return tx;
      }

      const slab = this.latestDynamicPayout?.amountRanges?.length
        ? this.getPayoutSlabInfo(tx, this.latestDynamicPayout, now)
        : null;

      if (!slab) return tx;

      return {
        ...tx,
        slabPercentage: slab.percentage,
        slabEligible: slab.eligible,
        timePassed: slab.diffMinutes,
      };
    });

    this.refreshCachedLists();
  }
  getMinutesDiff(date: any): number {
    if (!date) return 0;

    const createdTime = new Date(date).getTime();
    const now = Date.now();

    return Math.floor((now - createdTime) / 60000);
  }
  removeSelectedFile(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.selectedFile = null;
    this.previewUrl = null;
    this.previewDocument = false;

    const fileInput = document.getElementById(
      "approveFileInput",
    ) as HTMLInputElement;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  formatUtrNumber(utr: string | null | undefined): string {
    if (!utr) return "";

    const firstPart = utr.slice(0, 15);
    const secondPart = utr.slice(15);

    return secondPart ? `${firstPart}\n${secondPart}` : firstPart;
  }
  private refreshCachedLists(): void {
    this.cachedMobileTransactions = this.getPagedMobileTransactions();
    this.cachedPendingBank = this.pagedPendingBank();
    this.cachedPendingCrypto = this.pagedPendingCrypto();
    this.cachedPendingPayouts = this.pagedPendingpayouts();
    this.cachedPendingUpi = this.pagedPendingUpi();
    this.cachedApprovedPayins = this.pagedApprovedpayins();
    this.cachedApprovedPayouts = this.pagedApprovedpayouts();

    this.cachedPendingPayinAll = [
      ...this.cachedPendingUpi,
      ...this.cachedPendingBank,
      ...this.cachedPendingCrypto,
    ].sort((a, b) => {
      const t1 = new Date(a.date).getTime() || 0;
      const t2 = new Date(b.date).getTime() || 0;
      return t2 - t1;
    });
  }
  trackById(index: number, item: any): any {
    return item?.id || item?.fundId || index;
  }
  private startSlabTimer(): void {
    if (this.processingTimerId) return;

    this.processingNow = Date.now();

    this.processingTimerId = window.setInterval(() => {
      this.processingNow = Date.now();
      this.updateAllSlabPercentages();
      this.refreshCachedLists();
    }, 1000);
  }
  private isCryptoType(type: string): boolean {
    return this.cryptoTypes.includes((type || "").toUpperCase());
  }
  copyWalletAddress(): void {
    const address =
      this.selectedTransaction?.walletAddress ||
      this.selectedTransaction?.raw?.walletAddress;

    if (!address) return;

    navigator.clipboard.writeText(address).then(() => {
      this.snackbar.show("Wallet address copied", true);
    });
  }
  get currentRejectReasons(): string[] {
    return this.confirmTransaction?.type === "payout"
      ? this.payoutRejectReasons
      : this.payinRejectReasons;
  }

  private notifyProcessingExpired(tx: any): void {
    const fundId = tx.id || tx.fundId;
    if (!fundId) return;

    // ek baar hi trigger ho, baar baar (har second) na ho
    if (this.expiryNotifiedIds.has(fundId)) return;
    this.expiryNotifiedIds.add(fundId);

    //  naya API nahi — jo already data load karta hai wahi call karo
    this.loadBroadcast();

    // thodi der baad id clear kar do taaki future expiries (agar naya transaction hai) bhi handle ho sake
    setTimeout(() => this.expiryNotifiedIds.delete(fundId), 5000);
  }

  copyToClipboard(
    value: string | null | undefined,
    label: string = "Value",
  ): void {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      this.snackbar.show(`${label} copied`, true);
    });
  }
  private fetchPayoutInventory(mode: string): void {
    if (!this.entityId || !mode) return;

    this.loadingPayoutInventory = true;
    this.payoutInventoryOptions = [];
    this.selectedPayoutInventory = null;

    this.fundService
      .getInventoryForPayout({
        entityId: this.entityId,
        mode: String(mode).toUpperCase(), // bank/upi/trc20/erc20/bep20/omni/spl -> UPPERCASE
      })
      .pipe(catchError(() => of(null)))
      .subscribe((res: any) => {
        this.loadingPayoutInventory = false;

        const data = res?.data;
        if (!data) return; // inventory empty -> options khali hi rahenge, dropdown UI hide ho jayega

        const options: any[] = [];

        if (Array.isArray(data.bank)) {
          for (const b of data.bank) {
            options.push({
              id: b.id,
              accountId: b.id, // bank -> bankId as accountId
              kind: "bank",
              label: b.bankName || "Bank Account",
              subLabel: b.accountHolderName || b.accountNo || "",
              raw: b,
            });
          }
        }

        if (Array.isArray(data.upi)) {
          for (const u of data.upi) {
            options.push({
              id: u.id,
              accountId: u.id, // upi -> upiId as accountId
              kind: "upi",
              label: u.vpa || "UPI",
              subLabel: "",
              raw: u,
            });
          }
        }

        if (Array.isArray(data.crypto)) {
          for (const c of data.crypto) {
            options.push({
              id: c.id,
              accountId: c.walletAddress, // crypto -> walletAddress as accountId
              kind: "crypto",
              label: c.walletAddress || "—",
              subLabel: c.paymentMethod || "",
              raw: c,
            });
          }
        }

        this.payoutInventoryOptions = options;
      });
  }

  selectPayoutInventory(option: any): void {
    const isSame =
      this.selectedPayoutInventory?.id === option?.id &&
      this.selectedPayoutInventory?.kind === option?.kind;

    this.selectedPayoutInventory = isSame ? null : option;
    this.payoutDropdownOpen = false;
    this.payoutSearchQuery = ""; // reset search on select
  }

  togglePayoutDropdown(): void {
    if (!this.payoutInventoryOptions.length) return;
    this.payoutDropdownOpen = !this.payoutDropdownOpen;
    if (this.payoutDropdownOpen) {
      this.payoutSearchQuery = "";
    }
  }

  clearPayoutInventory(event: Event): void {
    event.stopPropagation();
    this.selectedPayoutInventory = null;
    this.payoutDropdownOpen = false;
    this.payoutSearchQuery = "";
  }

  // naya getter — search ke hisaab se filter
  filteredPayoutInventoryOptions(): any[] {
    const q = this.payoutSearchQuery.trim().toLowerCase();
    if (!q) return this.payoutInventoryOptions;

    return this.payoutInventoryOptions.filter((option) => {
      const label = (option.label || "").toLowerCase();
      const subLabel = (option.subLabel || "").toLowerCase();
      const walletAddress = (option.raw?.walletAddress || "").toLowerCase();
      const holderName = (
        option.raw?.accountHolderName ||
        option.raw?.holderName ||
        ""
      ).toLowerCase();
      const bankName = (option.raw?.bankName || "").toLowerCase();
      const vpa = (option.raw?.vpa || "").toLowerCase();

      return (
        label.includes(q) ||
        subLabel.includes(q) ||
        walletAddress.includes(q) ||
        holderName.includes(q) ||
        bankName.includes(q) ||
        vpa.includes(q)
      );
    });
  }
  @HostListener("document:click", ["$event"])
  onDocumentClickForPayoutDropdown(event: MouseEvent): void {
    if (!this.payoutDropdownOpen) return;
    const target = event.target as HTMLElement;
    if (!target.closest(".payout-account-dropdown")) {
      this.payoutDropdownOpen = false;
    }
  }
  isCryptoMode(mode: string | null | undefined): boolean {
    if (!mode) return false;
    return this.cryptoTypes.includes(String(mode).toUpperCase());
  }

  closePayoutColModal(): void {
    this.showPayoutColModal = false;
    this.payinData = [];
    this.showAllPayoutAccounts = false;
  }

  closePayinColModal(): void {
    this.showPayinColModal = false;
    this.payinColData = [];
    this.showAllPayinAccounts = false;
  }

  // ── existsInPayoutFunds (repeated payout user) — frontend pe compute ──
  private computePayoutUserCounts(): Map<string, number> {
    const map = new Map<string, number>();
    const all = [...this.pendingpayouts]; // sirf pending payouts se count

    for (const tx of all) {
      const uid = tx.userId || tx.raw?.userId || null;
      if (!uid) continue;
      map.set(uid, (map.get(uid) || 0) + 1);
    }

    return map;
  }

  private attachExistsInPayoutFunds(): void {
    const counts = this.computePayoutUserCounts();

    this.pendingpayouts = this.pendingpayouts.map((tx: any) => {
      const uid = tx.userId || tx.raw?.userId || null;
      const count = uid ? counts.get(uid) || 0 : 0;

      return { ...tx, existsInPayoutFunds: count };
    });
  }

  // ── Currency-wise sum helpers (header ke liye) ──
  private currencySymbol(code: string): string {
    const map: Record<string, string> = {
      INR: "₹",
      USDT: "$",
      EUR: "€",
      GBP: "£",
    };
    const key = (code || "").toUpperCase();
    return map[key] || "";
  }

  private sumByCurrency(
    list: any[],
    currencyFn: (t: any) => string,
    amountFn: (t: any) => number,
  ): { currency: string; symbol: string; total: number }[] {
    const map = new Map<string, number>();

    for (const t of list) {
      const cur = (currencyFn(t) || "N/A").toUpperCase();
      const amt = Number(amountFn(t)) || 0;
      map.set(cur, (map.get(cur) || 0) + amt);
    }

    return Array.from(map.entries()).map(([currency, total]) => ({
      currency,
      symbol: this.currencySymbol(currency),
      total,
    }));
  }

  getPayinCurrencySums(): {
    currency: string;
    symbol: string;
    total: number;
  }[] {
    const all = [
      ...this.filteredPendingUpi(),
      ...this.filteredPendingBank(),
      ...this.filteredPendingCrypto(),
      console.log("===== PAYIN DEBUG ====="),
    ];
    return this.sumByCurrency(
      all,
      (t) => t.parentCurrency, // 👈 ab hamesha parentCurrency (INR/USDT)
      (t) => t.currencyWiseAmount, // 👈 amount ki jagah currencyWiseAmount
    );
  }

  getPayoutCurrencySums(): {
    currency: string;
    symbol: string;
    total: number;
  }[] {
    return this.sumByCurrency(
      this.filteredPendingpayouts(),
      (t) => t.parentCurrency,
      (t) => t.currencyWiseAmount,
      // 👈 yaha bhi amount → currencyWiseAmount
    );
  }

  private updateCurrencySums(): void {
    const payinMap = new Map<string, any>();

    [...this.pendingUpi, ...this.pendingBank, ...this.pendingCrypto].forEach(
      (tx: any) => {
        const currency = tx.parentCurrency || tx.currency || "INR";
        const symbol = currency;

        if (!payinMap.has(currency)) {
          payinMap.set(currency, {
            currency,
            symbol,
            total: 0,
          });
        }

        payinMap.get(currency).total += Number(
          tx.currencyWiseAmount || tx.amount || 0,
        );
      },
    );

    this.payinCurrencySums = Array.from(payinMap.values());

    const payoutMap = new Map<string, any>();

    this.pendingpayouts.forEach((tx: any) => {
      const currency = tx.parentCurrency || tx.currency || "INR";
      const symbol = currency;

      if (!payoutMap.has(currency)) {
        payoutMap.set(currency, {
          currency,
          symbol,
          total: 0,
        });
      }

      payoutMap.get(currency).total += Number(
        tx.currencyWiseAmount || tx.amount || 0,
      );
    });

    this.payoutCurrencySums = Array.from(payoutMap.values());

    console.log("Payin:", this.payinCurrencySums);
    console.log("Payout:", this.payoutCurrencySums);
  }

  formatCurrencySum(s: any): string {
    const symbol = s.currency === "INR" ? "₹" : s.symbol || s.currency;

    return `${symbol} ${Number(s.total || 0).toLocaleString("en-IN")}`;
  }

  // ── Payin history modal (payin card + payout card dono use karenge) ──
  openPayinHistoryModal(
    p: any,
    event?: Event,
    fundType: "payin" | "payout" = "payin",
  ): void {
    event?.stopPropagation();

    this.userId = p.userId || p.raw?.userId || null;
    this.showPayinHistoryModal = true;
    this.showAllPayinHistoryAccounts = false;
    this.loadingPayinHistory = true;
    this.payinHistoryData = [];

    this.fundService
      .getPayinCountForHeadBranch({
        entityId: this.entityId,
        userId: this.userId,
        fundId: p.fundId || p.id,
        fundType: fundType,
      })
      .subscribe({
        next: (res: any) => {
          this.payinHistoryData = Array.isArray(res) ? res : res?.data || [];
          this.loadingPayinHistory = false;
        },
        error: () => {
          this.payinHistoryData = [];
          this.loadingPayinHistory = false;
        },
      });
  }

  closePayinHistoryModal(): void {
    this.showPayinHistoryModal = false;
    this.payinHistoryData = [];
    this.showAllPayinHistoryAccounts = false;
  }

  // ── Payout history modal (sirf payout card — repeated payout user) ──
  openPayoutHistoryModal(p: any, event?: Event): void {
    event?.stopPropagation();

    this.userId = p.userId || p.raw?.userId || null;
    this.showPayoutHistoryModal = true;
    this.showAllPayoutHistoryAccounts = false;
    this.loadingPayoutHistory = true;
    this.payoutHistoryData = [];

    this.fundService
      .getPayoutsCountForHeadBranch({
        entityId: this.entityId,
        userId: this.userId,
        fundId: p.id || p.id,
      })
      .subscribe({
        next: (res: any) => {
          this.payoutHistoryData = Array.isArray(res) ? res : res?.data || [];
          this.loadingPayoutHistory = false;
        },
        error: () => {
          this.payoutHistoryData = [];
          this.loadingPayoutHistory = false;
        },
      });
  }

  closePayoutHistoryModal(): void {
    this.showPayoutHistoryModal = false;
    this.payoutHistoryData = [];
    this.showAllPayoutHistoryAccounts = false;
  }
}
