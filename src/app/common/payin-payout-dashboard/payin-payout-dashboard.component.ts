import { Component, OnInit, OnDestroy } from "@angular/core";
import { UserStateService } from "../../pages/services/store/user-state.service";
import { TransactionHistoryService } from "../../pages/services/reports/transaction-history.service";
import { MultimediaService } from "../../pages/services/multimedia.service";
import { SnackbarService } from "../snackbar/snackbar.service";

// ==================== enums (same as report component) ====================
export enum TransactionMode {
  UPI = "UPI",
  AANI = "AANI",
  BANK = "BANK",
  ERC20 = "ERC20",
  BEP20 = "BEP20",
  TRC20 = "TRC20",
  OMNI = "OMNI",
  SPL = "SPL",
}

export enum TransactionType {
  PAYIN = "PAYIN",
  PAYOUT = "PAYOUT",
}

export enum FundReviewStatus {
  PENDING = "PENDING",
}

export enum Currency {
  INR = "INR",
  USDT = "USDT",
  AED = "AED",
}

// crypto modes get a coin icon + are labelled "Crypto" instead of the raw chain name
const CRYPTO_MODES = new Set([
  TransactionMode.ERC20,
  TransactionMode.BEP20,
  TransactionMode.TRC20,
  TransactionMode.OMNI,
  TransactionMode.SPL,
]);

// ==================== row shape (mirrors ReportRow from the report component) ====================
interface ReportRow {
  id: string;
  displayId: string;
  transactionId: string;
  transactionType: "PAYIN" | "PAYOUT";
  entityType: string;
  entityId: string;
  portal: string;
  mode: string;
  currency: string;
  amount: number;
  reviewStatus: string;
  remarks: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  walletAddress: string;
  vpa: string;
  userId: string;
  userName: string;
  holderName: string;
  category: string; // MANUAL / AUTO
  createdAt: string | Date | null;
  settled: boolean;
  raw: any;
}

interface DetailRow {
  label: string;
  value: string;
}

interface DetailSection {
  title: string;
  rows: DetailRow[];
}

@Component({
  selector: "app-payin-payout-dashboard",
  templateUrl: "./payin-payout-dashboard.component.html",
})
export class PayinPayoutDashboardComponent implements OnInit, OnDestroy {
  // ---------------- entity context ----------------
  entityId: any;
  entityType: any;

  // live "now" ticker — drives the PROCESSED countdown on payout cards
  now: number = Date.now();
  private timerInterval: any = null;

  // ---------------- data (kept separate so each column scrolls/paginates on its own) ----------------
  payinRows: ReportRow[] = [];
  payoutRows: ReportRow[] = [];

  payinTotal = 0;
  payoutTotal = 0;

  // shared server call is paged (page/size) but returns both PAYIN & PAYOUT together,
  // so we track one page cursor and keep appending until each side's total is reached.
  pageSize = 10;
  nextPage = 0;

  loading = false; // first load (skeleton)
  loadingMore = false; // subsequent scroll-triggered loads
  errorMessage = "";

  // ---------------- details modal ----------------
  showModal = false;
  selectedRow: ReportRow | null = null;
  modalImageUrl: string | null = null;
  modalImageLoading = false;
  modalImageError = false;
  modalImageExpanded = false; // fullscreen zoom preview toggle

  constructor(
    private userStateService: UserStateService,
    private transactionHistoryService: TransactionHistoryService,
    private multiMedia: MultimediaService,
    private snacBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.entityType = this.userStateService.getRole();
    this.loadInitial();

    // tick every second so getProcessingCountdown() re-evaluates live
    this.timerInterval = setInterval(() => {
      this.now = Date.now();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // ==================== helpers ====================
  private toLabel(value: string): string {
    if (!value) return "-";
    return value
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  private formatDateTime(value: any): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  }

  formatDateShort(value: any): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  displayValue(value: any): string {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "number") {
      return value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  }

  // last 4 characters only, e.g. "2341234213" -> "•••• 4213"
  maskValue(value: string | null | undefined): string {
    if (!value) return "-";
    const clean = String(value);
    if (clean.length <= 4) return clean;
    return `•••• ${clean.slice(-4)}`;
  }

  // ==================== row mapping (same precedence rules as the report component) ====================
  private mapRow(item: any, txType: "PAYIN" | "PAYOUT"): ReportRow {
    return {
      id:
        item.id ??
        item.displayId ??
        `${txType}-${Math.random().toString(36).slice(2)}`,
      displayId: item.displayId || item.id || "-",
      transactionId: item.transactionId || item.utr || "-",
      transactionType: txType,
      entityType: item.entityType || this.entityType || "-",
      entityId: item.entityId || "-",
      portal: item.portalDomain || item.portalName || item.portalId || "-",
      mode: item.payinType || item.mode || item.fundtype || "-",
      currency: item.currency || item.parentCurrency || "-",
      amount: Number(item.amount) || 0,
      reviewStatus: item.reviewStatus || item.status || "PENDING",
      remarks: item.queryText || item.remarks || item.message || "-",
      bankName: item.bankName || item.bank || "-",
      accountNo: item.accountNo || item.accountNumber || "-",
      ifsc: item.ifsc || "-",
      walletAddress: item.walletAddress || "-",
      vpa: item.vpa || "-",
      userId: item.userId || "-",
      userName: item.userName || item.username || "-",
      holderName: item.holder || item.bankAccountHolderName || "-",
      category: item.category || "-",
      createdAt: item.createdAt || item.dateTime || null,
      settled: !!item.settled,
      raw: item,
    };
  }

  // ==================== card presentation helpers ====================
  cardIcon(row: ReportRow): string {
    if (CRYPTO_MODES.has(row.mode as TransactionMode))
      return "currency_bitcoin";
    if (row.mode === TransactionMode.UPI || row.mode === TransactionMode.AANI)
      return "account_balance_wallet";
    return "account_balance"; // BANK / default
  }

  // e.g. "Bank • Manual" / "Crypto • Auto"
  modeTagLabel(row: ReportRow): string {
    const modePart = CRYPTO_MODES.has(row.mode as TransactionMode)
      ? "Crypto"
      : this.toLabel(row.mode);
    const catPart =
      row.category && row.category !== "-" ? this.toLabel(row.category) : null;
    return catPart ? `${modePart} • ${catPart}` : modePart;
  }

  // primary title line on the card: holder / bank account name > wallet label > username
  cardTitle(row: ReportRow): string {
    if (row.holderName && row.holderName !== "-") return row.holderName;
    if (row.walletAddress && row.walletAddress !== "-") return "Crypto Wallet";
    if (row.userName && row.userName !== "-") return this.toLabel(row.userName);
    return "Unknown";
  }

  // secondary line: "Account ••••3243 | #437EEB5" (falls back to wallet / VPA)
  cardSubline(row: ReportRow): string {
    let acct = "-";
    let label = "Account";
    if (row.accountNo && row.accountNo !== "-") {
      label = "Account";
      acct = this.maskValue(row.accountNo);
    } else if (row.walletAddress && row.walletAddress !== "-") {
      label = "Wallet";
      acct = this.maskValue(row.walletAddress);
    } else if (row.vpa && row.vpa !== "-") {
      label = "VPA";
      acct = row.vpa;
    }
    return `${label} ${acct}`;
  }

  // 3-bucket status for the card badge: pending / processing / completed / failed
  statusInfo(row: ReportRow): {
    label: string;
    cssClass: string;
    countdown: string | null;
  } {
    const status = row.reviewStatus;
    const countdown =
      row.transactionType === "PAYOUT"
        ? this.getProcessingCountdown(row)
        : null;

    if (status === "PENDING" || status === "DISPUTE_PENDING") {
      return { label: "Pending", cssClass: "badge-pending", countdown };
    }
    if (
      status === "PROCESSED" &&
      row.raw?.processing &&
      countdown &&
      countdown !== "Expired"
    ) {
      return { label: "Processing", cssClass: "badge-processing", countdown };
    }
    if (
      status === "CP_REJECTED" ||
      status === "INVALID" ||
      status === "DISPUTE_ESCALATED"
    ) {
      return {
        label: this.toLabel(status),
        cssClass: "badge-failed",
        countdown: null,
      };
    }
    // ACCEPTED / PROCESSED (settled) / anything else -> Completed
    return { label: "Completed", cssClass: "badge-completed", countdown: null };
  }

  // ==================== PAYOUT processing countdown (ported from the report component) ====================
  private formatCountdown(ms: number): string {
    if (ms <= 0) return "Expired";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  // only meaningful for PAYOUT rows with reviewStatus PROCESSED + a processingTimeLimit
  getProcessingCountdown(row: ReportRow): string | null {
    if (row.reviewStatus !== "PROCESSED") return null;
    const limit = row.raw?.processingTimeLimit;
    if (!limit) return null;
    const diff = new Date(limit).getTime() - this.now;
    return this.formatCountdown(diff);
  }

  // ==================== data loading ====================
  private loadInitial(): void {
    this.loading = true;
    this.errorMessage = "";
    this.payinRows = [];
    this.payoutRows = [];
    this.nextPage = 0;
    this.fetchPage(this.nextPage, true);
  }

  // called by the scroll listeners in the template when a column nears its bottom
  loadMore(): void {
    if (this.loadingMore || this.loading) return;
    if (
      this.payinRows.length >= this.payinTotal &&
      this.payoutRows.length >= this.payoutTotal
    ) {
      return; // both columns fully loaded
    }
    this.loadingMore = true;
    this.fetchPage(this.nextPage, false);
  }

  private fetchPage(page: number, isFirst: boolean): void {
    if (!this.entityId || !this.entityType) {
      this.loading = false;
      this.loadingMore = false;
      return;
    }

    // Last 1 month
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    fromDate.setHours(0, 0, 0, 0);

    // Today - end of day
    const toDate = new Date();
    toDate.setHours(23, 59, 59, 999);

    this.transactionHistoryService
      .getFundsForAllLevels({
        entityId: this.entityId,
        entityType: this.entityType,
        reviewStatus: Object.values(FundReviewStatus),
        fundType: Object.values(TransactionType),
        fundMode: Object.values(TransactionMode),
        currency: Object.values(Currency),

        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),

        page,
        size: this.pageSize,
        sort: "createdAt,desc",
      })
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res ?? {};
          const payin = data?.PAYIN ?? {};
          const payout = data?.PAYOUT ?? {};

          this.payinTotal = payin.totalElements ?? 0;
          this.payoutTotal = payout.totalElements ?? 0;

          if (this.payinRows.length < this.payinTotal) {
            this.payinRows = [
              ...this.payinRows,
              ...(payin.content ?? []).map((item: any) =>
                this.mapRow(item, "PAYIN"),
              ),
            ];
          }

          if (this.payoutRows.length < this.payoutTotal) {
            this.payoutRows = [
              ...this.payoutRows,
              ...(payout.content ?? []).map((item: any) =>
                this.mapRow(item, "PAYOUT"),
              ),
            ];
          }

          this.nextPage = page + 1;
          this.loading = false;
          this.loadingMore = false;
        },
        error: (err) => {
          this.loading = false;
          this.loadingMore = false;
          this.errorMessage =
            err?.error?.message || "Failed to load transactions";

          this.snacBar.show(this.errorMessage, false);
        },
      });
  }

  refresh(): void {
    this.loadInitial();
  }

  // called from (scroll) on each list container
  onColumnScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    if (nearBottom) this.loadMore();
  }

  trackByRowId(_index: number, row: ReportRow): string {
    return row.id;
  }

  // ==================== details modal (same pattern as the report component) ====================

  // filePath sometimes arrives as a bare fileId (needs entityId-scoped private
  // fetch via getPrivateImage) and sometimes as an already-complete URL (fetched
  // as-is via getImageByUrl). Detect which one we got and call the right API.
  private isFullUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  openDetails(row: ReportRow): void {
    this.selectedRow = row;
    this.showModal = true;
    this.modalImageUrl = null;
    this.modalImageError = false;
    this.modalImageLoading = false;
    this.modalImageExpanded = false;

    const filePath = row.raw?.filePath;
    if (filePath) {
      this.modalImageLoading = true;

      const imageObservable = this.isFullUrl(filePath)
        ? this.multiMedia.getImageByUrl(filePath)
        : this.multiMedia.getPrivateImage(filePath);

      imageObservable.subscribe({
        next: (url: string) => {
          this.modalImageUrl = url;
          this.modalImageLoading = false;
        },
        error: () => {
          this.modalImageLoading = false;
          this.modalImageError = true;
        },
      });
    }
  }

  toggleImageExpand(): void {
    if (!this.modalImageUrl) return;
    this.modalImageExpanded = !this.modalImageExpanded;
  }

  closeModal(): void {
    if (this.modalImageUrl) URL.revokeObjectURL(this.modalImageUrl);
    this.showModal = false;
    this.selectedRow = null;
    this.modalImageUrl = null;
    this.modalImageError = false;
    this.modalImageLoading = false;
    this.modalImageExpanded = false;
  }

  // grouped sections for the modal — Transaction / Payment Destination / Rates & Amounts
  getDetailSections(row: ReportRow | null): DetailSection[] {
    if (!row) return [];
    const raw = row.raw || {};
    const isPayin = row.transactionType === "PAYIN";
    const sections: DetailSection[] = [];

    sections.push({
      title: "Transaction",
      rows: [
        { label: "Transaction ID", value: this.displayValue(row.displayId) },
        { label: "UTR / Ref No", value: this.displayValue(row.transactionId) },
        { label: "Type", value: row.transactionType },
        { label: "Mode", value: this.modeTagLabel(row) },
        { label: "Currency", value: this.displayValue(row.currency) },
        { label: "Amount", value: this.displayValue(row.amount) },
        { label: "Review Status", value: this.toLabel(row.reviewStatus) },
        {
          label: isPayin ? "Dispute Reason" : "Remarks",
          value: this.displayValue(row.remarks),
        },
        { label: "Created At", value: this.formatDateTime(row.createdAt) },
        { label: "Updated At", value: this.formatDateTime(raw.updatedAt) },
      ],
    });

    // live countdown shown only for a still-processing payout
    if (!isPayin) {
      const countdown = this.getProcessingCountdown(row);
      if (countdown) {
        sections[0].rows.splice(7, 0, {
          label: "Processing Time Left",
          value: countdown,
        });
      }
    }

    sections.push({
      title: "Payment Destination",
      rows: [
        { label: "User ID", value: this.displayValue(raw.userId) },
        { label: "Username", value: this.displayValue(raw.userName) },
        { label: "Account No", value: this.displayValue(raw.accountNo) },
        { label: "IFSC", value: this.displayValue(raw.ifsc) },
        {
          label: "Wallet Address",
          value: this.displayValue(raw.walletAddress),
        },
        { label: "VPA", value: this.displayValue(raw.vpa) },
        {
          label: "Account Holder",
          value: this.displayValue(raw.holder || raw.bankAccountHolderName),
        },
      ],
    });

    const rateRows: DetailRow[] = [
      {
        label: "CC Wise Amount",
        value: this.displayValue(raw.currencyCcWiseAmount),
      },
      {
        label: "CP Wise Amount",
        value: this.displayValue(raw.currencyCpWiseAmount),
      },
      { label: "Rate", value: this.displayValue(raw.rate) },
      { label: "CC Rate", value: this.displayValue(raw.ccRate) },
      { label: "CP Rate", value: this.displayValue(raw.cpRate) },
    ];
    if (isPayin)
      rateRows.push({
        label: "Payin Type",
        value: this.displayValue(raw.payinType),
      });
    sections.push({ title: "Rates & Amounts", rows: rateRows });

    return sections;
  }

  downloadAttachment(): void {
    if (!this.modalImageUrl) return;
    const ext = this.guessExtensionFromPath(this.selectedRow?.raw?.filePath);
    const link = document.createElement("a");
    link.href = this.modalImageUrl;
    link.download = `attachment-${this.selectedRow?.displayId || "file"}${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private guessExtensionFromPath(filePath?: string): string {
    if (!filePath) return "";
    const match = filePath.match(/\.[a-zA-Z0-9]+($|\?)/);
    return match ? match[0].replace("?", "") : "";
  }
}