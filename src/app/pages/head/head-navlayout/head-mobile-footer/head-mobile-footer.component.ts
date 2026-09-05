import { Component, OnDestroy, OnInit } from "@angular/core";
import { Input } from "@angular/core";
import { ThemeService } from "../../../../theme/theme.service";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { BalanceService } from "../../../services/balance.service"; // adjust path if different
import { UserStateService } from "../../../services/store/user-state.service";
import { FundsService } from "../../../services/funds.service";
import { ComPartService } from "../../../services/com-part.service";

@Component({
  selector: "app-head-mobile-footer",
  templateUrl: "./head-mobile-footer.component.html",
  styleUrl: "./head-mobile-footer.component.css",
})
export class HeadMobileFooterComponent implements OnInit,OnDestroy {
  @Input() payin = 0;
  @Input() payout = 0;
  @Input() reward = 0;
  @Input() limit = 0;
  @Input() exploser = 0;
  @Input() parentCurrency: string = "INR";

  currentUserId:any;
  currentUserRole:any;

  isOpen = false;
  activeSection: "balance" | "percentages" | "exposure" = "balance";

  loadingPercentages = false;
  percentages: any = null;

  loadingExposure = false;
  exposure: any = null;
parentCurrencySymbol="";
  showPendingThreads = false;
  chatPanelOpen = false;
  entityId: any;
  entityType: any;
formattedPayin = "";
formattedPayout = "";
formattedReward = "";
formattedExploser = "";
formattedLimit = "";

formattedPendingPayin = "";
formattedPendingPayout = "";
formattedDisputePayin = "";
formattedDisputePayout = "";
formattedTotalPayin = "";
formattedTotalPayout = "";
formattedHeldAmount = "";
  private destroy$ = new Subject<void>();

  constructor(
    public theme: ThemeService,
    private router: Router,
    private userStateService:UserStateService,
    private fundsService:FundsService,
    private compartService:ComPartService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getCurrentEntityId();
    this.currentUserRole = this.userStateService.getRole();
    this.updateFormattedAmounts();
    
  }

  goToChats() {
    this.router.navigate(["/head/chat"]);
    this.isOpen = false;
  }

  openPendingThreads() {
    this.showPendingThreads = true;
  }

  closePendingThreads(): void {
    this.showPendingThreads = false;
  }

  onChatPanelStateChange(isOpen: boolean): void {
    this.chatPanelOpen = isOpen;
  }

  toggleSheet() {
    this.isOpen = !this.isOpen;
  }

  setActiveSection(section: "balance" | "percentages" | "exposure") {
    this.activeSection = section;
    if (section === "percentages") {
      this.fetchGlobalPercentages();
    } else if (section === "exposure") {
      this.fetchExposureList();
    }
  }

  fetchGlobalPercentages() {
    this.loadingPercentages = true;
    this.compartService
      .getPercentageByEntityId(this.currentUserId, this.currentUserRole) // TODO: confirm method name
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.percentages = res.minPercentage;
          this.loadingPercentages = false;
        },
        error: () => {
          this.percentages = null;
          this.loadingPercentages = false;
        },
      });
  }

  fetchExposureList() {
    this.loadingExposure = true;
    this.fundsService
      .getExposure(this.currentUserId, "ENTITY")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        
        next: (res: any) => {
          this.exposure = res;
          this.loadingExposure = false;
  this.parentCurrencySymbol = this.getCurrencySymbol(this.parentCurrency);
  this.updateFormattedAmounts();
        },
        error: () => {
          this.exposure = null;
          this.loadingExposure = false;
        },
      });
  }

  get exposureTotalPayin(): number {
    return (this.exposure?.pendingPayin || 0) + (this.exposure?.disputePayin || 0);
  }

  get exposureTotalPayout(): number {
    return (this.exposure?.pendingPayout || 0) + (this.exposure?.disputePayout || 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

updateFormattedAmounts(): void {
  this.formattedPayin = Number(this.payin || 0).toLocaleString("en-IN");
  this.formattedPayout = Number(this.payout || 0).toLocaleString("en-IN");
  this.formattedReward = Number(this.reward || 0).toLocaleString("en-IN");
  this.formattedExploser = Number(this.exploser || 0).toLocaleString("en-IN");
  this.formattedLimit = Number(this.limit || 0).toLocaleString("en-IN");

  if (this.exposure) {
    this.formattedPendingPayin =
      Number(this.exposure.payinFunds.pending || 0).toLocaleString("en-IN");

    this.formattedPendingPayout =
      Number(this.exposure.payoutFunds.pending || 0).toLocaleString("en-IN");

    this.formattedDisputePayin =
      Number(this.exposure.payinFunds.disputeEscalated || 0).toLocaleString("en-IN");

    this.formattedDisputePayout =
      Number(this.exposure.payoutFunds.disputeEscalated || 0).toLocaleString("en-IN");

    this.formattedTotalPayin =
      Number(this.exposure.payinFunds.total || 0).toLocaleString("en-IN");

    this.formattedTotalPayout =
      Number(this.exposure.payoutFunds.total || 0).toLocaleString("en-IN");

    this.formattedHeldAmount =
      Number(this.exposure.heldAmount || 0).toLocaleString("en-IN");
  }
}

  getCurrencySymbol(currency: string): string {
   
    const symbols: any = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
      USDT: "₮",
      AED: "د.إ",
    };

    return symbols[currency?.toUpperCase()] || currency || "";
  }
}