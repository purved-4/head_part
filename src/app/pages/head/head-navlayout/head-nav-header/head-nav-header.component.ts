import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  NgZone,
} from "@angular/core";
import { Router } from "@angular/router";
import { LimitsService } from "../../../services/reports/limits.service";
import { UserStateService } from "../../../../store/user-state.service";
import { SocketConfigService } from "../../../services/socket/socket-config.service";
import { FundsService } from "../../../services/funds.service";
import { ChiefService } from "../../../services/chief.service";
import { HeadService } from "../../../services/head.service";
// import { PortalSharingService } from "../../../services/portal-sharing.service";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { ThemeService } from "../../../../theme/theme.service";
import { ComPartService } from "../../../services/com-part.service";
import { BulkUpdateService } from "../../../services/bulk-update.service";

@Component({
  selector: "app-head-nav-header",
  templateUrl: "./head-nav-header.component.html",
  styleUrls: ["./head-nav-header.component.css"],
})
export class HeadNavHeaderComponent implements OnInit {
  @Input() pageTitle: string = "Dashboard";
  @Input() userName: string = "Branch User";
  @Input() notifications: number = 3;
  @Input() marginLeft: number = 0;
  @Input() parentCurrency: string = "INR";
  // Add with tp @Inputs
  @Input() isMobileMenuOpen = false;
  @Output() toggleMobileMenu = new EventEmitter<void>();
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
  @Output() search = new EventEmitter<string>();
  @Output() balanceChange = new EventEmitter<any>();
  isProfileOpen = false;
  @ViewChild("profileContainer") profileContainer!: ElementRef;
  @ViewChild("limitsContainer") limitsContainer!: ElementRef;
  @Input() notificationUnreadCount: number = 0;

  isLimitsOpen = false;

  dummyStats = {
    currentLimit: "₹50,000",
    workTime: "08:45",
    upiLimit: "₹25,000",
    bankLimit: "₹1,00,000",
    payout: "₹1,20,000",
    payin: "₹50,000",
    reward: "500 pts",
  };
  hoverTimeout: any;

  loadingTooltipTimer: any;
  apiTimer: any;

  showTooltip = false;
  loadingPercentages = false;
  hasLoaded = false;

  percentages = {
    payinPercentage: 0,
    payoutPercentage: 0,
    fttPercentage: 0,
  };
  searchTerm = "";
 @ViewChild("exposureContainer") exposureContainer!: ElementRef;

exposureData: any = null;
exposureLoading = false;
isExposureOpen = false;

  searchResults: any[] = [];

  allRoutes = [
    {
      label: "Dashboard",
      path: "/head/dashboard",
      keywords: ["dashboard", "home"],
      icon: "dashboard",
    },

    {
      label: "Override Currency",
      path: "/head/override-currency-management",
      keywords: ["currency", "rate", "exchange"],
      icon: "currency_exchange",
    },

    {
      label: "Recycle UPI",
      path: "/head/recycle-management",
      keywords: ["recycle", "upi"],
      icon: "delete",
    },

    {
      label: "Recycle Bank",
      path: "/head/recycle-management",
      keywords: ["recycle", "bank"],
      icon: "account_balance",
    },

    {
      label: "Add Branch",
      path: "/head/branch/add",
      keywords: ["branch", "add", "create"],
      icon: "add_business",
    },

    {
      label: "Manage Branch",
      path: "/head/branch/manage",
      keywords: ["branch", "manage"],
      icon: "account_tree",
    },

    {
      label: "Chat",
      path: "/head/chat",
      keywords: ["chat", "message"],
      icon: "chat",
    },

    {
      label: "Limits",
      path: "/head/limit",
      keywords: ["limit", "balance"],
      icon: "speed",
    },

    {
      label: "Recycle Management",
      path: "/head/recycle-management",
      keywords: ["recycle", "management"],
      icon: "delete",
    },

    {
      label: "Transaction History",
      path: "/head/reports/transaction-history",
      keywords: ["transaction", "history", "report"],
      icon: "receipt_long",
    },

    {
      label: "Entity Report",
      path: "/head/reports/entity-report",
      keywords: ["entity", "report"],
      icon: "bar_chart",
    },

    {
      label: "Funds Report",
      path: "/head/reports/funds-report",
      keywords: ["fund", "report"],
      icon: "account_balance_wallet",
    },

    {
      label: "Work Time Report",
      path: "/head/reports/work-time",
      keywords: ["work", "time"],
      icon: "schedule",
    },

    {
      label: "Banks",
      path: "/head/bank",
      keywords: ["bank", "accounts"],
      icon: "account_balance",
    },

    {
      label: "UPIs",
      path: "/head/upi",
      keywords: ["upi", "vpa"],
      icon: "qr_code",
    },

    {
      label: "Shared User Profile",
      path: "/head/sharedUserProfile",
      keywords: ["profile", "user"],
      icon: "person",
    },
  ];
  selectedIndex = -1;

  showSearchDropdown = false;
  headId: any;
  payinStatus: any = false;
  timerInterval: any;
  countdown: string = "";
  currentUserRole: any;
  limitRemainingAmount: any = 0;
  currentRoleId: any;
  payoutBalance: any = 0;
  payinBalance: any = 0;
  rewards: any;
  exploser: any;
  bankBalance: any = 0;
  upiBalance: any = 0;
  isCountdownFinished: boolean = false;
  role: any;
  private retryTimeout: any;
  payinTime: string | null = null;
  // Popup state
  showPercentagesModal = false;
  userId: any;
  portalPopupOpen = false;
  portalPercentages: any[] = [];
  loadingPortalPercent = false;
  // Add these inputs at the top with tp @Inputs
  @Input() isMobileOpen = false;
  @Output() closeMobileMenu = new EventEmitter<void>();
  @Output() notificationClick = new EventEmitter<void>();
  @ViewChild("portalContainer") portalContainer!: ElementRef;
  isPortalOpen = false;
  private noDataSnackbarShown = false;
  constructor(
    private limitService: LimitsService,
    private userStateService: UserStateService,
    private socketService: SocketConfigService,
    private fundService: FundsService,
    private headServices: HeadService,
    private compartService: ComPartService,
    // private portalState: PortalSharingService,
    private snack: SnackbarService,
    private ngZone: NgZone,
    public theme: ThemeService,
    private router: Router,
    private bulkService: BulkUpdateService,
  ) {}

  ngOnInit(): void {
    this.headId = this.userStateService.getCurrentEntityId();
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserRole = this.userStateService.getRole();
    this.userId = this.userStateService.getUserId();
    this.getPayinStatus();

    this.socketService.subscribeLatestBalance(
      this.currentUserRole,
      this.currentRoleId,
    );

    //  SOCKET REAL-TIME
    this.socketService.getLatestBalance().subscribe((res) => {
      this.ngZone.run(() => {
        this.limitRemainingAmount = res?.entityBalance ?? 0;
        this.payinBalance = res?.totalPayin ?? 0;
        this.payoutBalance = res?.totalPayout ?? 0;
        this.rewards = res?.reward ?? 0;
        this.exploser = res?.exploser ?? 0;

        this.emitBalances();
      });
    });

    //  INITIAL API
    this.limitService
      .getLatestLimitsByEntityAndType(this.currentRoleId, this.currentUserRole)
      .subscribe((res) => {
        this.ngZone.run(() => {
          this.limitRemainingAmount = res?.entityBalance ?? 0;
          this.payinBalance = res?.totalPayin ?? 0;
          this.payoutBalance = res?.totalPayout ?? 0;
          this.rewards = res?.reward ?? 0;
          this.exploser = res?.exploser ?? 0;
          this.emitBalances();
        });
      });
    this.fetchExposureData();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  getCurrencySymbol(parentCurrency: string): string {
    const map: any = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
      USDT: "₮",
      AED: "د.إ",
    };

    return map[parentCurrency?.toUpperCase()] || parentCurrency || "";
  }
  toggleLimitsPopup() {
    this.isLimitsOpen = !this.isLimitsOpen;
  }
  // Open portal popup
  openPortalPopup() {
    this.currentRoleId = this.userStateService.getCurrentEntityId();

    if (!this.currentRoleId) {
      return;
    }

    this.portalPopupOpen = true;
    this.portalPercentages = [];
    this.loadPortalPercentages();
  }

  // Close portal popup
  closePortalPopup() {
    this.portalPopupOpen = false;
  }

  // Load API data
  loadPortalPercentages() {
    this.loadingPortalPercent = true;

    // this.headServices.getHeadPortalPercentage(this.currentRoleId).subscribe({
    //   next: (res: any) => {
    //     if (Array.isArray(res)) {
    //       this.portalPercentages = res;
    //     } else if (res?.data && Array.isArray(res.data)) {
    //       this.portalPercentages = res.data;
    //     } else {
    //       this.portalPercentages = [];
    //     }

    //     this.loadingPortalPercent = false;
    //   },
    //   error: (err) => {
    //     this.portalPercentages = [];
    //     this.loadingPortalPercent = false;
    //   },
    // });
  }

  // Refresh data
  refreshPortalData() {
    this.loadPortalPercentages();
  }

  onToggleClick() {
    this.toggleSidebar.emit();
  }

  onOpenSettings() {
    this.openSettings.emit();
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value.toLowerCase().trim();

    this.searchTerm = value;

    if (!value || value.length < 2) {
      this.searchResults = [];

      this.showSearchDropdown = false;

      return;
    }

    this.searchResults = this.allRoutes.filter(
      (route) =>
        route.label.toLowerCase().includes(value) ||
        route.keywords.some((k: string) => k.includes(value)),
    );

    this.showSearchDropdown = this.searchResults.length > 0;
    this.selectedIndex = this.searchResults.length ? 0 : -1;
  }

  onSearchKeyDown(event: KeyboardEvent) {
    if (!this.showSearchDropdown) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();

        this.selectedIndex =
          (this.selectedIndex + 1) % this.searchResults.length;

        break;

      case "ArrowUp":
        event.preventDefault();

        this.selectedIndex =
          (this.selectedIndex - 1 + this.searchResults.length) %
          this.searchResults.length;

        break;

      case "Enter":
        event.preventDefault();

        if (this.selectedIndex >= 0) {
          this.navigateTo(this.searchResults[this.selectedIndex].path);
        }

        break;

      case "Escape":
        this.showSearchDropdown = false;
        this.selectedIndex = -1;

        break;
    }
  }

  navigateTo(path: string) {
    this.router.navigateByUrl(path);

    this.searchTerm = "";

    this.searchResults = [];

    this.showSearchDropdown = false;
  }

  getUserInitials(): string {
    if (!this.userName) return "BU";
    return this.userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  formatIndianAmount(amount: number | string): string {
    if (amount === null || amount === undefined) return "0";

    const value = Number(amount);
    if (isNaN(value)) return "0";

    const truncate = (num: number, decimals: number) => {
      const factor = Math.pow(10, decimals);
      return Math.floor(num * factor) / factor;
    };

    if (value >= 10000000) {
      const cr = truncate(value / 10000000, 2);
      return cr % 1 === 0 ? `${cr}Cr` : `${cr}Cr`;
    }

    if (value >= 100000) {
      const l = truncate(value / 100000, 2);
      return l % 1 === 0 ? `${l}L` : `${l}L`;
    }

    if (value >= 1000) {
      const k = truncate(value / 1000, 2);
      return k % 1 === 0 ? `${k}K` : `${k}K`;
    }

    return value.toString();
  }

  formatFullAmount(amount: number | string): string {
    if (amount === null || amount === undefined) return "₹0";
    return "₹" + Number(amount).toLocaleString("en-IN");
  }

  changePayinStatus() {
    this.headServices.toggleDashbaordPayin(this.headId).subscribe({
      next: () => {
        this.snack.show("Payin status updated successfully", true);

        // Latest status aur payinTime ek baar fetch karo
        this.getPayinStatus();
      },
      error: () => {
        this.snack.show("Failed to update payin status", false);
      },
    });
  }

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  closeProfile() {
    this.isProfileOpen = false;
  }

  // Combined HostListener for Escape key
  @HostListener("document:keydown.escape")
onEscapeKeydown() {
  if (this.isProfileOpen) this.closeProfile();
  if (this.portalPopupOpen) this.closePortalPopup();
  if (this.isPortalOpen) this.isPortalOpen = false;
  if (this.showPercentagesModal) this.closePercentagesModal();
  if (this.isExposureOpen) this.closeExposurePopup();
}

  // Combined HostListener for clicks outside
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    // Close profile
    if (this.isProfileOpen && this.profileContainer) {
      const clickedInside = this.profileContainer.nativeElement.contains(
        event.target,
      );
      if (!clickedInside) {
        this.closeProfile();
      }
    }

    // Close percentages tooltip
  if (this.showPercentagesModal && this.percentagesContainer) {
    const clickedInside = this.percentagesContainer.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.showPercentagesModal = false;
    }
  }

    // Close limits popup
    if (this.isLimitsOpen && this.limitsContainer) {
      const clickedInside = this.limitsContainer.nativeElement.contains(
        event.target,
      );
      if (!clickedInside) {
        this.isLimitsOpen = false;
      }
    }

    // Close portal popup
    if (this.isPortalOpen && this.portalContainer) {
      const clickedInside = this.portalContainer.nativeElement.contains(
        event.target,
      );
      if (!clickedInside) {
        this.isPortalOpen = false;
      }
    }

    // Close exposure popup
  if (this.isExposureOpen && this.exposureContainer) {
    const clickedInside = this.exposureContainer.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.isExposureOpen = false;
    }
  }
  }

  togglePortalPopup() {
    this.isPortalOpen = !this.isPortalOpen;
  }

  private emitBalances() {
    this.balanceChange.emit({
      payin: this.payinBalance,
      payout: this.payoutBalance,
      reward: this.rewards,
      exploser: this.exploser,
      limit: this.limitRemainingAmount,
      parentCurrency: this.parentCurrency, // ADD THIS
    });
  }

  onNotificationIconClick() {
    this.notificationClick.emit();
  }

  getUnreadCount(): number {
    return this.notificationUnreadCount;
  }
  getPayinStatus() {
    this.headServices.getHeadById(this.headId).subscribe({
      next: (res: any) => {
        this.payinStatus = res?.payin ?? false;

        const newPayinTime = res?.payinTime ?? null;

        if (!this.payinStatus && newPayinTime) {
          const target = new Date(newPayinTime).getTime();

          if (target > Date.now()) {
            this.payinTime = newPayinTime;
            this.isCountdownFinished = false;
            this.startCountdown(newPayinTime);
          } else {
            this.payinTime = null;
            this.isCountdownFinished = true;
            this.countdown = "";
            this.clearCountdown();
          }
        } else {
          this.payinTime = null;
          this.countdown = "";
          this.isCountdownFinished = false;
          this.clearCountdown();
        }
      },
      error: () => {
        this.clearCountdown();
      },
    });
  }
  startCountdown(payinTime: string) {
    this.clearCountdown();

    this.timerInterval = setInterval(() => {
      const target = new Date(payinTime).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        this.countdown = "";
        this.clearCountdown();

        // Countdown khatam hone ke baad sirf ek baar refresh
        this.getPayinStatus();

        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      this.countdown =
        `${h.toString().padStart(2, "0")}:` +
        `${m.toString().padStart(2, "0")}:` +
        `${s.toString().padStart(2, "0")}`;
    }, 1000);
  }
  clearCountdown() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

 
toggleExposure(event: MouseEvent) {
  event.stopPropagation();
  this.isExposureOpen = !this.isExposureOpen;

  if (this.isExposureOpen) {
    this.fetchExposureData();
  }
}

closeExposurePopup() {
  this.isExposureOpen = false;
}



  private fetchExposureData() {
    this.exposureLoading = true;

    this.fundService.getExposure(this.currentRoleId, "ENTITY").subscribe({
      next: (res: any) => {
        console.log("ecskhdklha", res);

        const data = res ?? {};

        this.exposureData = {
          payinPending: data.payinFunds?.pending ?? 0,
          payinDispute: data.payinFunds?.disputeEscalated ?? 0,
          payinAccepted: data.payinFunds?.accepted ?? 0,
          payinTotal: data.payinFunds?.total ?? 0,

          payoutPending: data.payoutFunds?.pending ?? 0,
          payoutDispute: data.payoutFunds?.disputeEscalated ?? 0,
          payoutAccepted: data.payoutFunds?.accepted ?? 0,
          payoutTotal: data.payoutFunds?.total ?? 0,

          heldAmount: data.heldAmount ?? 0,
        };

        console.log(this.exposureData);

        this.exposureLoading = false;
      },
      error: () => {
        this.exposureLoading = false;
        this.exposureData = null;
      },
    });
  }

// 1. Add a ViewChild to detect outside clicks
@ViewChild("percentagesContainer") percentagesContainer!: ElementRef;

// 2. Replace openPercentagesModal() with togglePercentages()
togglePercentages(event: MouseEvent) {
  event.stopPropagation();
  this.showPercentagesModal = !this.showPercentagesModal;

  if (this.showPercentagesModal) {
    this.loadingPercentages = true;

    this.compartService
      .getPercentageByEntityId(this.currentRoleId, this.currentUserRole)
      .subscribe({
        next: (res: any) => {
          this.percentages = res.minPercentage;
          console.log(res);
          this.loadingPercentages = false;
        },
        error: () => {
          this.loadingPercentages = false;
        },
      });
  }
}

closePercentagesModal() {
  this.showPercentagesModal = false;
}

claimRewards() {
  this.fundService.claimRewards().subscribe({
    next: (res: any) => {
      this.rewards = res.released;
      this.snack.show(
        res?.message || 'Rewards claimed successfully',
        true
      );

    },
    error: (err) => {
      this.snack.show(
        err?.error?.message || 'Failed to claim rewards',
        false
      );
    },
  });
}
}

