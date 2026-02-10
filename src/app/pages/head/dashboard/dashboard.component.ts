1326;
// #----------------------------------#
// | NOTE:-1326                       |
// #----------------------------------#

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Chart, registerables } from "chart.js";
import { catchError, lastValueFrom, of, forkJoin, Subscription } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { FundsService } from "../../services/funds.service";
import { SocketConfigService } from "../../../common/socket/socket-config.service";
import { PoolingService } from "../../services/pooling.service";
import { UserStateService } from "../../../store/user-state.service";
import { BankService } from "../../services/bank.service";
import { LimitsService } from "../../services/reports/limits.service";
import { UpiService } from "../../services/upi.service";
import { BranchService } from "../../services/branch.service";
import { fileBaseUrl } from "../../services/helper";
// import { PoolingService } from "../../services/pooling.service"; // not used directly here

Chart.register(...registerables);

@Component({
  selector: 'head-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class HeadDashboardComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild("trendChart") trendChartRef!: ElementRef;
  @ViewChild("topupMethodChart") topupMethodChartRef!: ElementRef;
  @ViewChild("payoutBankChart") payoutBankChartRef!: ElementRef;

  private trendChart?: Chart;
  private topupMethodChart?: Chart;
  private payoutBankChart?: Chart;

  websites: any[] = [];

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

  totaltopups = 0;
  totalpayouts = 0;
  activeAccounts = 0;

  // NEW: UI state flags for toggling topup/payout monitoring
  topupActive = true;
  payoutActive = true;

  // Original mixed lists (kept for compatibility if needed)
  pendingTransactions: any[] = [];
  approvedTransactions: any[] = [];
  approvedtopups: any[] = [];
  approvedpayouts: any[] = [];

  // NEW: sectioned pending arrays
  pendingUpi: any[] = [];
  pendingBank: any[] = [];
  pendingpayouts: any[] = [];

  branchCom = 0;
  acceptedUpi = 0;
  acceptedBank = 0;
  acceptedDep = 0;

  processingNow = Date.now();
  private processingTimerId: any = null;

  acceptedWid: any;

  recenttopups: any[] = [];
  recentpayouts: any[] = [];

  selectedTransaction: any = null;

  selectedFile: File | null = null;
  isDragging = false;

  // filters
  pendingFilterType: "all" | "topup" | "payout" = "all";
  pendingFilterMethod: "all" | "upi" | "bank" = "all";

  approvedtopupsFilterMethod: "all" | "upi" | "bank" = "all";
  approvedpayoutsFilterMethod: "all" | "bank" = "all";

  selectedTimeRange = 7;

  private colorScheme = {
    topup: "#10b981",
    topupLight: "#34d399",
    topupDark: "#059669",
    payout: "#3b82f6",
    payoutLight: "#60a5fa",
    payoutDark: "#2563eb",
    upi: "#8b5cf6",
    upiLight: "#a78bfa",
    bank: "#06b6d4",
    bankLight: "#22d3ee",
  };

  branchId: any;
  userId: any;

  private routeSub: Subscription | null = null;

  approvedPage = 1;
  approvedPageSize = 5;
  approvedPageSizes = [5, 8, 12];

  pendingPage = 1;
  pendingPageSize = 5;
  pendingPageSizes = [5, 8];

  payoutApprovedPage = 1;
  payoutApprovedPageSize = 5;
  payoutApprovedPageSizes = [5, 8, 12];

  showApproveConfirm = false;
  showRejectConfirm = false;
  confirmTransaction: any = null;
  reason: any = "rejects";

  rejectReasons: string[] = [
    "Insufficient funds",
    "Suspicious activity",
    "Mismatch details",
    "Duplicate transaction",
    "Other",
  ];
  customReason: string = "";
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

  selectedPayoutMethod: "upi" | "bank" = "upi";
  selectedUpi: any = null;
  selectedBank: any = null;

  constructor(
    private route: ActivatedRoute,
    private BranchService: BranchService,
    private fundService: FundsService,
    private authService: AuthService,
    private pollingService: PoolingService,
    private userStateService: UserStateService,
    private socketConfigService: SocketConfigService,
    private bankService: BankService,
    private upiService: UpiService
  ) {}

  ngOnInit(): void {
    console.log("Branch Dashboard Init");
    this.branchId = this.userStateService.getCurrentRoleId();
    this.role = this.userStateService.getRole();

    this.fundService.broadcast(this.branchId,this.role).subscribe((data: any) => {
      console.log(data);

      this.processIncomingEvent(data);
    });

    

    this.resetAllLists();
    // this.refreshAllFunds(this.branchId);

    this.socketConfigService.subscribeToPendingData(this.branchId);

    this.sse = this.socketConfigService.getPendingData().subscribe((data) => {
      if (!data) return;
      console.log(data);

      this.processIncomingEvent(data);
    });
  }

  private resetAllLists() {
    this.pendingTransactions = [];
    this.approvedTransactions = [];
    this.approvedtopups = [];
    this.approvedpayouts = [];
    this.recenttopups = [];
    this.recentpayouts = [];

    // new per-section pending arrays
    this.pendingUpi = [];
    this.pendingBank = [];
    this.pendingpayouts = [];
  }

 
 

  // New: fetch accepted/settled records from APIs to use as ground truth for charts/stats
  private refreshAllFunds(branchId?: string) {
    if (!branchId) branchId = this.branchId;
    if (!branchId) return;

    // clear previously approved lists (we'll refill)
    this.approvedtopups = [];
    this.approvedpayouts = [];
    this.approvedTransactions = [];

    const bankObs = this.fundService
      .getAllBankFundWithBranchId(branchId, "ACCEPTED")
      .pipe(catchError((e) => of([])));
    const upiObs = this.fundService
      .getAllUpiFundWithBranchId(branchId, "ACCEPTED")
      .pipe(catchError((e) => of([])));
    const withdrawObs = this.fundService
      .getAllpayoutTrueFalseBybranchId(branchId, "ACCEPTED")
      .pipe(catchError((e) => of([])));

    forkJoin({ bank: bankObs, upi: upiObs, payout: withdrawObs }).subscribe(
      (res: any) => {
        // bank and upi are accepted topups
        this.mapFundsArray(res.upi || [], "upi", true);
        this.mapFundsArray(res.bank || [], "bank", true);
        // payouts
        this.mappayoutsArray(res.payout || []);

        // compute accepted sums (amounts) so UI shows totals even if SSE hasn't provided them
        const upiArr = Array.isArray(res.upi) ? res.upi : [];
        const bankArr = Array.isArray(res.bank) ? res.bank : [];
        const withdrawArr = Array.isArray(res.payout) ? res.payout : [];

        this.acceptedUpi = upiArr.reduce(
          (s: number, a: any) => s + (Number(a.amount) || 0),
          0
        );
        this.acceptedBank = bankArr.reduce(
          (s: number, a: any) => s + (Number(a.amount) || 0),
          0
        );
        this.acceptedWid = withdrawArr.reduce(
          (s: number, a: any) => s + (Number(a.amount) || 0),
          0
        );

        this.acceptedDep = this.acceptedBank + this.acceptedUpi;

        // recompute
        this.computeStatsFromData();
        this.updateChartsFromData();
        this.clampPages();
      },
      (err) => {
        console.error("Error refreshing funds", err);
      }
    );
  }

  private mapFundsArray(
    funds: any[],
    mode: "bank" | "upi",
    settledFlag: boolean
  ): void {
    if (!Array.isArray(funds) || funds.length === 0) return;

    for (const fund of funds) {
      try {
        const tx = {
          id: fund.id || null,
          fundId: fund.id || null,
          type: "topup",
          website:
            fund.websiteName ||
            fund.websiteDomain ||
            fund.websiteId ||
            "Website",
          amount: Number(fund.amount) || 0,
          date: fund.createdAt
            ? new Date(fund.createdAt)
            : fund.dateTime
            ? new Date(fund.dateTime)
            : new Date(),
          utrNumber: fund.transactionId || fund.utr || null,
          mode: mode,
          accountNo: fund.accountNo || null,
          bankId: fund.bankId || null,
          bankName: fund.bankName || fund.bank || null,
         filePath: fund.filePath
                     ? `${fileBaseUrl}/${fund.filePath}`
                     : fund.filePath || null,
          remarks: fund.remarks || null,
          settled: !!fund.settled,
          raw: fund,
          upiId: fund.vpa,
        };

        if (settledFlag || tx.settled) {
          const approvedTx = { ...tx, status: "completed" };
          this.approvedTransactions.unshift(approvedTx);
          this.approvedtopups.unshift(approvedTx);
        } else {
          // place into per-section pending arrays
          if (mode === "upi") {
            this.pendingUpi.unshift(tx);
          } else {
            this.pendingBank.unshift(tx);
          }
        }
      } catch (err) {
        console.error("Error mapping fund record", err, fund);
      }
    }
  }

  private mappayoutsArray(payouts: any[]): void {
    if (!Array.isArray(payouts) || payouts.length === 0) return;

    for (const w of payouts) {
      try {
        const tx = {
          id: w.id || null,
          fundId: w.id || null,
          type: "payout",
          website: w.websiteName || w.websiteDomain || w.websiteId || null,
          amount: Number(w.amount) || 0,
          date: w.createdAt ? new Date(w.createdAt) : new Date(),
          utrNumber: w.transactionId || w.utr || null,
          mode: "bank",
          accountNo: w.accountNo || w.accountNumber || null,
          bankId: w.bankId || null,
          bankName: w.bankName || w.bank || w.bankName || null,
         filePath: w.filePath
            ? `${fileBaseUrl}/${w.filePath}`
            : w.filePath || null,
          remarks: w.remarks || w.message || null,
          settled: !!w.settled,
          raw: w,
          holderName: w.holderName || w.accountHolderName || null,
        };

        if (tx.settled) {
          const approvedTx = { ...tx, status: "completed" };
          this.approvedTransactions.unshift(approvedTx);
          this.approvedpayouts.unshift(approvedTx);
        } else {
          this.pendingpayouts.unshift(tx);
        }
      } catch (err) {
        console.error("Error mapping payout record", err, w);
      }
    }
  }

  private extractWebsitesFromFetched(allFunds: any[]): void {
    if (!Array.isArray(allFunds)) return;
    const seen = new Set<string>();
    const sites: { name: string; id?: any }[] = [];
    for (const f of allFunds) {
      const name = f.websiteName || f.websiteDomain || f.websiteId || null;
      if (name && !seen.has(name)) {
        seen.add(name);
        sites.push({ name, id: f.websiteId || null });
      }
    }
    if (sites.length) this.websites = sites;
  }

  private computeStatsFromData(): void {
    this.totaltopups = this.approvedtopups.reduce(
      (s, r) => s + (Number(r.amount) || 0),
      0
    );
    this.totalpayouts = this.approvedpayouts.reduce(
      (s, r) => s + (Number(r.amount) || 0),
      0
    );

    // combine pending lists for active accounts calculation (keeps compatibility)
    const allPending = [
      ...this.pendingUpi,
      ...this.pendingBank,
      ...this.pendingpayouts,
    ];

    const uniqueAccounts = new Set<string>();
    for (const p of allPending) {
      if (p.accountNo) uniqueAccounts.add(p.accountNo);
      else if (p.bankId) uniqueAccounts.add(p.bankId);
      else if (p.website) uniqueAccounts.add(p.website);
    }
    this.activeAccounts = uniqueAccounts.size;
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
      tx.processingTimeLimit ||
      (tx.raw && tx.raw.processingTimeLimit) ||
      (tx.raw && tx.raw.processingTimeLimit);
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  getRemainingTimeLabel(tx: any): string {
    if (!tx || !tx.processing) return "Process";
    const deadline = this.parseProcessingDeadline(tx);
    if (!deadline) return "Processing";

    let diffMs = deadline.getTime() - this.processingNow;
    if (diffMs <= 0) {
      // If you prefer to show "Process" or "Expired" when time is up, change this line.
      return "00:00";
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
    this.inittopupMethodChart();
    this.initpayoutBankChart();
  }

  // ---------------------------
  // Helper utilities (add these)
  // ---------------------------
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
    // compare multiple known id-like fields defensively
    const aIds = this.normalizeIdValues(a);
    const bIds = this.normalizeIdValues(b);
    if (aIds.length === 0 || bIds.length === 0) return false;
    return aIds.some((id) => bIds.includes(id));
  }

  private removeFromPendingListsByTx(tx: any): void {
    if (!tx) return;
    // Remove matching entries from each pending list using identifiersMatch
    const removeFrom = (list: any[]) => {
      for (let i = list.length - 1; i >= 0; i--) {
        try {
          if (this.identifiersMatch(list[i], tx)) {
            list.splice(i, 1);
          }
        } catch (e) {
          // ignore and continue
        }
      }
    };
    removeFrom(this.pendingUpi);
    removeFrom(this.pendingBank);
    removeFrom(this.pendingpayouts);
  }

  private addApprovedUnique(list: any[], tx: any): void {
    try {
      const exists = list.some((x) => this.identifiersMatch(x, tx));
      if (!exists) list.unshift(tx);
    } catch (e) {
      // fallback
      list.unshift(tx);
    }
  }

  private resetRejectReason(): void {
    // restore your default and clear custom input
    this.reason = "rejects";
    this.customReason = "";
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
          new Date(l).toLocaleDateString()
        ),
        datasets: [
          {
            label: "topups",
            data: new Array(this.selectedTimeRange).fill(0),
            borderColor: this.colorScheme.topup,
            backgroundColor: this.hexToRgba(this.colorScheme.topup, 0.1),
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: this.colorScheme.topup,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverBackgroundColor: this.colorScheme.topupDark,
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
                  ctx.parsed.y
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

  private inittopupMethodChart(): void {
    const ctx =
      this.topupMethodChartRef?.nativeElement?.getContext &&
      this.topupMethodChartRef.nativeElement.getContext("2d");
      console.log(ctx);
      
    if (!ctx) return;
    this.topupMethodChart = new Chart(ctx, {
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
    this.topupMethodChart?.destroy();
    this.payoutBankChart?.destroy();
  }

  private ensureChartsInitialized(): void {
    // Initialize any charts that haven't been created yet — safe to call multiple times
    try {
      if (!this.trendChart && this.trendChartRef?.nativeElement) {
        this.initTrendChart();
      }
      if (!this.topupMethodChart && this.topupMethodChartRef?.nativeElement) {
        this.inittopupMethodChart();
      }
      if (!this.payoutBankChart && this.payoutBankChartRef?.nativeElement) {
        this.initpayoutBankChart();
      }
    } catch (e) {
      // don't break the app if chart init fails; will attempt again on next update
      console.warn("Chart init failed, will retry on next update", e);
    }
  }

  private updateChartsFromData(): void {
    // Ensure charts exist (handles cases where data arrives before viewInit or when canvas wasn't ready)
    this.ensureChartsInitialized();

    // Defer actual chart updates to the next frame so the DOM layout settles
    requestAnimationFrame(() => {
      const topupsAll = [
        ...this.pendingUpi,
        ...this.pendingBank,
      ];
      const upiSum = this.acceptedUpi
      const bankSum = this.acceptedBank;

      if (this.topupMethodChart) {
        try {
          this.topupMethodChart.data.datasets[0].data = [upiSum, bankSum];
          this.topupMethodChart.update();
        } catch (e) {
          console.warn("topupMethodChart update failed", e);
        }
      }

      const payoutsAll = [...this.approvedpayouts, ...this.pendingpayouts];

      const bankMap = new Map<string, number>();
      for (const f of payoutsAll) {
        const key = f.bankName || f.accountNo || f.holderName || "Unknown Bank";
        bankMap.set(key, (bankMap.get(key) || 0) + (Number(f.amount) || 0));
      }
      const sortedBanks = Array.from(bankMap.entries()).sort(
        (a, b) => b[1] - a[1]
      );
      const topBanks = sortedBanks.slice(0, 10);
      const bankLabels = topBanks.map((x) => x[0]);
      const bankValues = topBanks.map((x) => x[1]);

      if (this.payoutBankChart) {
        try {
          this.payoutBankChart.data.labels = bankLabels;
          (this.payoutBankChart.data.datasets[0].data as any) = bankValues;
          this.payoutBankChart.update();
        } catch (e) {
          console.warn("payoutBankChart update failed", e);
        }
      }

      const labels = this.getLastNDatesLabels(this.selectedTimeRange);
      const topupArr = new Array(this.selectedTimeRange).fill(0);
      const payoutArr = new Array(this.selectedTimeRange).fill(0);

      for (const f of topupsAll) {
        const dateStr = new Date(f.date).toDateString();
        const idx = labels.findIndex(
          (lbl) => new Date(lbl).toDateString() === dateStr
        );
        if (idx >= 0) topupArr[idx] += Number(f.amount) || 0;
      }
      for (const f of payoutsAll) {
        const dateStr = new Date(f.date).toDateString();
        const idx = labels.findIndex(
          (lbl) => new Date(lbl).toDateString() === dateStr
        );
        if (idx >= 0) payoutArr[idx] += Number(f.amount) || 0;
      }

      if (this.trendChart) {
        try {
          this.trendChart.data.labels = labels.map((l) =>
            new Date(l).toLocaleDateString()
          );
          (this.trendChart.data.datasets[0].data as any) = topupArr;
          (this.trendChart.data.datasets[1].data as any) = payoutArr;
          this.trendChart.update();
        } catch (e) {
          console.warn("trendChart update failed", e);
        }
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
      (p) => p.value === this.selectedPollingInterval
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
    this.pendingPage = 1;
  }

  onApprovedtopupsFilterChange() {
    this.approvedPage = 1;
  }

  onApprovedpayoutsFilterChange() {
    this.payoutApprovedPage = 1;
  }

  viewTransactionDetails(transaction: any): void {
    if (!transaction) return;
    // Normalize the incoming object so modal bindings (utrNumber, upiId, accountNo, holderName, filePath, bankName, date etc.) are always present
    this.selectedTransaction = this.normalizeTransaction(transaction);
  }

  filteredPending(): any[] {
    // backward-compatible combined pending list
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

  // UPI pending
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
    const start = (this.pendingPage - 1) * this.pendingPageSize;
    return list.slice(start, start + this.pendingPageSize);
  }

  // Bank pending
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
  pagedPendingBank(): any[] {
    const list = this.filteredPendingBank();
    const start = (this.pendingPage - 1) * this.pendingPageSize;
    return list.slice(start, start + this.pendingPageSize);
  }

  // payouts pending
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
    const start = (this.pendingPage - 1) * this.pendingPageSize;
    return list.slice(start, start + this.pendingPageSize);
  }

  filteredApprovedtopups(): any[] {
    return this.approvedtopups.filter((d) => {
      if (this.approvedtopupsFilterMethod !== "all") {
        return d.mode === this.approvedtopupsFilterMethod;
      }
      return true;
    });
  }

  pagedApprovedtopups(): any[] {
    const list = this.filteredApprovedtopups();
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
      Math.ceil(this.filteredApprovedtopups().length / this.approvedPageSize)
    );
  }

  pendingTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredPending().length / this.pendingPageSize)
    );
  }

  payoutApprovedTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(
        this.filteredApprovedpayouts().length / this.payoutApprovedPageSize
      )
    );
  }

  setApprovedPage(p: number) {
    this.approvedPage = Math.min(Math.max(1, p), this.approvedTotalPages());
  }
  setPendingPage(p: number) {
    this.pendingPage = Math.min(Math.max(1, p), this.pendingTotalPages());
  }
  setpayoutApprovedPage(p: number) {
    this.payoutApprovedPage = Math.min(
      Math.max(1, p),
      this.payoutApprovedTotalPages()
    );
  }

  onChangeApprovedPageSize(size: number) {
    this.approvedPageSize = size;
    this.approvedPage = 1;
  }
  onChangePendingPageSize(size: number) {
    this.pendingPageSize = size;
    this.pendingPage = 1;
  }
  onChangepayoutApprovedPageSize(size: number) {
    this.payoutApprovedPageSize = size;
    this.payoutApprovedPage = 1;
  }

  private clampPages() {
    if (this.approvedPage > this.approvedTotalPages())
      this.approvedPage = this.approvedTotalPages();
    if (this.pendingPage > this.pendingTotalPages())
      this.pendingPage = this.pendingTotalPages();
    if (this.payoutApprovedPage > this.payoutApprovedTotalPages())
      this.payoutApprovedPage = this.payoutApprovedTotalPages();
  }

  async approveTransaction(transaction: any): Promise<void> {
    if (!transaction) return;

    // normalize incoming transaction object so we always use same structure
    const t = this.normalizeTransaction(transaction) || transaction;
    const fundId =
      t.fundId ||
      t.id ||
      (t.raw && (t.raw.id || t.raw._id || t.raw.fundId)) ||
      null;

    try {
      // Call correct API
      if (t.type === "payout") {
        // Get selected payout account id depending on selectedPayoutMethod
        const accountId =
          this.selectedPayoutMethod === "upi"
            ? this.selectedUpi
            : this.selectedPayoutMethod === "bank"
            ? this.selectedBank
            : null;

        console.log(accountId);

        // Send accountId as param when approving payout.
        // I pass it as an object { accountId } — adjust to your API shape if needed.
        if (accountId) {
          await lastValueFrom(
            (this.fundService as any).acceptpayout(fundId, accountId).pipe(
              catchError((err) => {
                console.error("settlepayout", err);
                return of({ success: false, error: err });
              })
            )
          );
        } else {
          // Fallback to previous call if no accountId selected
          await lastValueFrom(
            (this.fundService as any).acceptpayout(fundId).pipe(
              catchError((err) => {
                console.error("settlepayout", err);
                return of({ success: false, error: err });
              })
            )
          );
        }
      } else if (t.mode === "upi") {
        await lastValueFrom(
          this.fundService.settleUpiFund(fundId).pipe(
            catchError((err) => {
              console.error("settleUpiFund", err);
              return of({ success: false, error: err });
            })
          )
        );
      } else if (t.mode === "bank") {
        await lastValueFrom(
          this.fundService.settleBankFund(fundId).pipe(
            catchError((err) => {
              console.error("settleBankFund", err);
              return of({ success: false, error: err });
            })
          )
        );
      }

      // Remove from pending arrays robustly (match by any id-like field)
      this.removeFromPendingListsByTx(t);

      // Build approved tx and add only if unique
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
        this.addApprovedUnique(this.approvedtopups, approvedTx);
        this.recenttopups = [...this.approvedtopups];
      }

      // Clear confirm / UI state
      this.confirmTransaction = null;
      this.showApproveConfirm = false;
      this.selectedTransaction = null;
      this.resetRejectReason();

      // Refresh server-side accepted/settled totals to keep charts accurate
      // this.refreshAllFunds();

      // recompute
      this.computeStatsFromData();
      this.updateChartsFromData();
      this.clampPages();
    } catch (err) {
      console.error("Error settling fund", err);

      // Best-effort: remove pending duplicates and mark as failed locally
      this.removeFromPendingListsByTx(t);

      const failedTx = { ...t, status: "failed" };
      if (t.type === "payout") this.recentpayouts.unshift(failedTx);
      else this.recenttopups.unshift(failedTx);

      this.computeStatsFromData();
      this.updateChartsFromData();
      this.clampPages();

      // clear UI
      this.confirmTransaction = null;
      this.showApproveConfirm = false;
      this.selectedTransaction = null;
      this.resetRejectReason();
    }
  }

  openEditAmountPopup(): void {
    this.editAmountData = {
      newAmount: this.selectedTransaction.amount,
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

  saveEditedAmount(): void {
    if (!this.editAmountData.newAmount || this.editAmountData.newAmount <= 0) {
      console.error("Please enter a valid amount");
      return;
    }

    // Prepare update data
    const updateData = {
      fundId: this.selectedTransaction.id,
      oldAmount: this.selectedTransaction.amount,
      amount: this.editAmountData.newAmount,
      reason: this.editAmountData.message,
      file: this.editAmountData.file,
      timestamp: new Date().toISOString(),
      updatedBy: "owner", // Replace with actual user ID
    };


    this.fundService.updateAmount(updateData,this.editAmountData.file).subscribe((res) => {
      console.log(res);
    });

    // Update transaction in UI
    this.selectedTransaction.amount = this.editAmountData.newAmount;

    // Show success message
    // this.showNotification('Amount updated successfully', 'success');

    // Close popup
    this.closeEditAmountPopup();
  }

  onProcessingClick(fundId: any) {
    console.log("data", fundId);

    this.fundService
      .updateProcessingStatus(fundId.id, this.branchId)
      .subscribe((res) => {});
  }

  // Reset edit amount data
  resetEditAmountData(): void {
    this.editAmountData = {
      newAmount: 0,
      message: "",
      file: null,
      isDragging: false,
    };

    // Reset file input
    const fileInput = document.getElementById(
      "editFileInput"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  // File handling methods for edit popup
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
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes

    if (file.size > maxSize) {
      console.error("File size exceeds 5MB limit");
      // You can show a toast notification here
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error("File type not supported");
      // You can show a toast notification here
      return;
    }

    this.editAmountData.file = file;
  }

  removeEditFile(): void {
    this.editAmountData.file = null;
    const fileInput = document.getElementById(
      "editFileInput"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  async rejectTransaction(transaction: any, message: any,file: File): Promise<void> {
    if (!transaction) return;

    const t = this.normalizeTransaction(transaction) || transaction;
    const fundId =
      t.fundId ||
      t.id ||
      (t.raw && (t.raw.id || t.raw._id || t.raw.fundId)) ||
      null;

    try {
      let rejectObservable;

      if (t.type === "payout") {
        rejectObservable = this.fundService.rejectpayout(fundId, message,file);
      } else if (t.mode === "upi" || t.type === "upi") {
        rejectObservable = this.fundService.rejectUpiFund(fundId, message,file);
      } else if (t.mode === "bank" || t.type === "bank") {
        rejectObservable = this.fundService.rejectBankFund(fundId, message,file);
      } else {
        console.warn("Unknown type/mode, skipping reject call");
      }

      if (rejectObservable) {
        await lastValueFrom(
          rejectObservable.pipe(
            catchError((err) => {
              console.error("Reject API failed", err);
              return of({ success: false, error: err });
            })
          )
        );
      }
    } catch (err) {
      console.error("Error calling reject API", err);
    } finally {
      // Remove from pending arrays reliably
      this.removeFromPendingListsByTx(t);

      // Move to recent failed list (avoid duplicates)
      const failedTx = { ...t, status: "failed" };
      // ensure not duplicated in recent lists
      if (t.type === "payout") {
        if (!this.recentpayouts.some((x) => this.identifiersMatch(x, failedTx)))
          this.recentpayouts.unshift(failedTx);
        // also keep approvedpayouts clean
        this.approvedpayouts = this.approvedpayouts.filter(
          (x) => !this.identifiersMatch(x, failedTx)
        );
      } else {
        if (!this.recenttopups.some((x) => this.identifiersMatch(x, failedTx)))
          this.recenttopups.unshift(failedTx);
        this.approvedtopups = this.approvedtopups.filter(
          (x) => !this.identifiersMatch(x, failedTx)
        );
      }

      // Close modals and clear selection
      this.confirmTransaction = null;
      this.showRejectConfirm = false;
      this.selectedTransaction = null;
      this.resetRejectReason();

      // Refresh and recompute
      // this.refreshAllFunds();
      this.computeStatsFromData();
      this.updateChartsFromData();
      this.clampPages();
    }
  }

  openApproveConfirm(tx: any) {
    console.log(tx);
    const websiteId = tx.raw.website
    
    if (this.banks == null) {
      this.bankService
        .getBankDataWithEntityIdAndWebsiteId(this.branchId,websiteId)
        .subscribe((res) => {
          this.banks = res.data;
        });
    }

    if (this.upis == null) {
      this.upiService.getAllByEntityIdAndWebsiteId(this.branchId,websiteId).subscribe((res: any) => {
        this.upis = res.data;
      });
    }

    if (!tx) return;
    const t = this.normalizeTransaction(tx) || tx;
    const src =
      t.type === "payout"
        ? "payout"
        : t.mode === "upi"
        ? "upi"
        : t.mode === "bank"
        ? "bank"
        : "none";

    this.confirmTransaction = { ...t, section: src };
    this.showApproveConfirm = true;
    // keep reason untouched for approve, but ensure custom resets
    this.selectedPayoutMethod = "upi";
    this.selectedUpi = null;
    this.selectedBank = null;
    this.customReason = "";
  }

  openRejectConfirm(tx: any) {
    if (!tx) return;
    const t = this.normalizeTransaction(tx) || tx;
    const src =
      t.type === "payout"
        ? "payout"
        : t.mode === "upi"
        ? "upi"
        : t.mode === "bank"
        ? "bank"
        : "none";

    this.confirmTransaction = { ...t, section: src };
    this.showRejectConfirm = true;
    // reset reason inputs so user sees a clean dialog every time
    this.resetRejectReason();
  }

  async confirmApprove() {
    if (!this.confirmTransaction) return;
    await this.approveTransaction(this.confirmTransaction);
    // ensure UI state cleared (approveTransaction clears too)
    this.confirmTransaction = null;
    this.showApproveConfirm = false;
  }
  get rejectionReason(): string {
    if (!this.reason) return "";
    return this.reason === "Other" || this.reason === "other"
      ? (this.customReason || "").trim()
      : this.reason;
  }

 async confirmReject() {
  if (!this.confirmTransaction) return;

  if (!this.selectedFile) {
    console.warn("File is required for rejection");
    return;
  }

  const finalReason = this.rejectionReason;

  await this.rejectTransaction(
    this.confirmTransaction,
    finalReason,
    this.selectedFile
  );

  this.confirmTransaction = null;
  this.showRejectConfirm = false;
  this.resetForm();
}

  resetForm(): void {
    this.reason = "";
    this.customReason = "";
    this.selectedFile = null;
    this.isDragging = false;
    this.showRejectConfirm = false;

    // Reset file input
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  cancelApprove() {
    this.showApproveConfirm = false;
    this.selectedPayoutMethod = "upi";
    this.confirmTransaction = null;
    this.showApproveConfirm = false;
    if (this.showRejectConfirm === true) {
      this.showRejectConfirm = false;
    }
    this.resetRejectReason();
  }

  // ---------------------------------------------------------------------------
  // NEW METHODS: toggles for topup/payout "active" state
  // ---------------------------------------------------------------------------
  toggletopup(): void {
    this.topupActive = !this.topupActive;
    // purely UI-only state; no API call
  }

  togglepayout(): void {
    this.payoutActive = !this.payoutActive;
  }

  // helper to return css/text for the status small label (not used in template currently but available)
  getActiveSmallLabel(
    active: boolean,
    type: "topup" | "payout"
  ): {
    label: string;
    classes: string;
  } {
    if (type === "topup") {
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

  // Process incoming SSE/broadcast event and update local pending lists
  private normalizeIncomingFund(
    fund: any,
    guessedMode?: "bank" | "upi" | "payout"
  ) {
    if (!fund) return null;
    const mode = guessedMode
      ? guessedMode
      : fund.type === "payout" ||
        fund.transactionType === "payout" ||
        fund.reviewStatus === "WITHDRAWAL"
      ? "payout"
      : fund.type === "bank" || fund.bankId || fund.accountNo
      ? "bank"
      : fund.type === "upi" || fund.vpa
      ? "upi"
      : "bank";

    const filePathRaw = fund.filePath || fund.snapshot || fund.qrImage || null;
    const filePath = filePathRaw
      ? filePathRaw.startsWith("http")
        ? filePathRaw
        : `${fileBaseUrl}/${filePathRaw}`
      : null;
    const tx = {
      id: fund.id || fund._id || null,
      fundId: fund.id || fund.fundId || fund._id || null,
      type:
        fund.type === "payout"
          ? "payout"
          : fund.type === "bank" || fund.type === "upi"
          ? "topup"
          : fund.transactionType === "payout"
          ? "payout"
          : "topup",
      website: fund.websiteName || fund.websiteDomain || fund.websiteId || null,
      amount: Number(fund.amount) || 0,
      date: fund.createdAt
        ? new Date(fund.createdAt)
        : fund.dateTime
        ? new Date(fund.dateTime)
        : fund.updatedAt
        ? new Date(fund.updatedAt)
        : new Date(),
      utrNumber: fund.transactionId || fund.utr || null,
      mode: mode,
      accountNo: fund.accountNo || fund.accountNumber || null,
      bankId: fund.bankId || null,
      bankName: fund.bankName || fund.bank || fund.bank_name || null,
      filePath: filePath,
      remarks: fund.remarks || fund.message || null,
      settled: !!fund.settled,
      raw: fund,
      processing: fund.processing,
      upiId: fund.vpa || fund.upiId || null,
      holderName:
        fund.bankAccountHolderName ||
        fund.bankHolderName ||
        fund.holderName ||
        fund.accountHolderName ||
        fund.name ||
        null,
      ifscCode:
        fund.ifscCode || fund.ifsc || (fund.raw && fund.raw.ifsc) || null,
    };

    return tx;
  }

  private normalizeTransaction(tx: any) {
    if (!tx) return tx;
    // If object already normalized (has mode and a Date), return as-is
    if (tx.mode && tx.date instanceof Date) return tx;
    // If tx.raw exists and looks like original payload, normalize raw
    if (tx.raw) return this.normalizeIncomingFund(tx.raw);
    return this.normalizeIncomingFund(tx);
  }

  private processIncomingEvent(data: any) {
    if (!data) return;

    // Map incoming arrays to normalized transactions so UI bindings work consistently
    this.pendingUpi = Array.isArray(data.PENDING_UPI)
      ? data.PENDING_UPI.map((f: any) =>
          this.normalizeIncomingFund(f, "upi")
        ).filter(Boolean)
      : [];

    this.pendingBank = Array.isArray(data.PENDING_BANK)
      ? data.PENDING_BANK.map((f: any) =>
          this.normalizeIncomingFund(f, "bank")
        ).filter(Boolean)
      : [];

    this.pendingpayouts = Array.isArray(data.PENDING_PAYOUT)
      ? data.PENDING_PAYOUT.map((f: any) =>
          this.normalizeIncomingFund(f, "payout")
        ).filter(Boolean)
      : [];

    // keep accepted counters if provided
    this.acceptedUpi =
      typeof data.ACCEPTED_CURRENCY_UPI !== "undefined"
        ? data.ACCEPTED_CURRENCY_UPI
        : this.acceptedUpi;
    this.acceptedBank =
      typeof data.ACCEPTED_CURRENCY_BANK !== "undefined"
        ? data.ACCEPTED_CURRENCY_BANK
        : this.acceptedBank;

     this.acceptedWid =
      typeof data.ACCEPTED_CURRENCY_PAYOUT !== "undefined"
        ? data.ACCEPTED_CURRENCY_PAYOUT
        : this.acceptedWid;
        
    this.acceptedDep = this.acceptedBank + this.acceptedUpi;
    this.branchCom =
      typeof data.Head_Balance !== "undefined"
        ? data.Head_Balance
        : this.branchCom;

    // rebuild websites list from incoming bank pending (or all funds if you'd prefer)
    this.extractWebsitesFromFetched(this.pendingBank.map((p) => p.raw || p));

    // Recompute UI state
    this.computeStatsFromData();
    this.updateChartsFromData();
    this.clampPages();
  }

  // Ensure accepted payouts amount is present by calling the API when SSE doesn't provide it
  

  // File handling methods
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    this.validateAndSetFile(file);
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
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes

    if (file.size > maxSize) {
      // Show error message (you can implement your own notification system)
      console.error("File size exceeds 5MB limit");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error("File type not supported");
      return;
    }

    this.selectedFile = file;
  }

  removeFile(): void {
    this.selectedFile = null;
    // Reset file input
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }
  // ---------------------------------------------------------------------------
}

