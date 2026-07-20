import { Component, OnDestroy, OnInit } from "@angular/core";
import { Input } from "@angular/core";
import { ThemeService } from "../../../../theme/theme.service";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { BalanceService } from "../../../services/balance.service"; // adjust path if different
import { UserStateService } from "../../../../store/user-state.service";
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

  showPendingThreads = false;
  chatPanelOpen = false;
  entityId: any;
  entityType: any;

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

  format(amount: number): string {
    return Number(amount || 0).toLocaleString("en-IN");
  }

  getCurrencySymbol(currency: string): string {
    const map: any = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
      USDT: "₮",
      AED: "د.إ",
    };

    return map[currency?.toUpperCase()] || currency || "";
  }
}