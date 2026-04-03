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

  isLimitsOpen = false;

  dummyStats = {
    currentLimit: "₹50,000",
    workTime: "08:45",
    upiLimit: "₹25,000",
    bankLimit: "₹1,00,000",
    payout: "₹1,20,000",
    topup: "₹50,000",
    reward: "500 pts",
  };

  searchTerm: string = "";

  currentUserRole: any;
  limitRemainingAmount: any = 0;
  currentRoleId: any;
  payoutBalance: any = 0;
  topupBalance: any = 0;
  rewards: any;
  bankBalance: any = 0;
  upiBalance: any = 0;

  // Popup state
  portalPopupOpen = false;
  portalPercentages: any[] = [];
  loadingPortalPercent = false;
  // Add these inputs at the top with tp @Inputs
  @Input() isMobileOpen = false;
  @Output() closeMobileMenu = new EventEmitter<void>();
  @ViewChild("portalContainer") portalContainer!: ElementRef;
  isPortalOpen = false;
  private noDataSnackbarShown = false;
  constructor(
    private limitService: LimitsService,
    private userStateService: UserStateService,
    private socketService: SocketConfigService,
    private fundService: FundsService,
    private headServices: HeadService,
    // private portalState: PortalSharingService,
    private snack: SnackbarService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserRole = this.userStateService.getRole();

    this.socketService.subscribeLatestBalance(
      this.currentUserRole,
      this.currentRoleId,
    );

    //  SOCKET REAL-TIME
    this.socketService.getLatestBalance().subscribe((res) => {
      this.ngZone.run(() => {
        this.limitRemainingAmount = res?.entityBalance ?? 0;
        this.topupBalance = res?.totalTopup ?? 0;
        this.payoutBalance = res?.totalPayout ?? 0;
        this.rewards = res?.reward ?? 0;

        this.emitBalances();
      });
    });

    //  INITIAL API
    this.limitService
      .getLatestLimitsByEntityAndType(this.currentRoleId, this.currentUserRole)
      .subscribe((res) => {
        this.ngZone.run(() => {
          this.limitRemainingAmount = res?.entityBalance ?? 0;
          this.topupBalance = res?.totalTopup ?? 0;
          this.payoutBalance = res?.totalPayout ?? 0;
          this.rewards = res?.reward ?? 0;

          this.emitBalances();
        });
      });
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

    this.headServices.getHeadPortalPercentage(this.currentRoleId).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.portalPercentages = res;
        } else if (res?.data && Array.isArray(res.data)) {
          this.portalPercentages = res.data;
        } else {
          this.portalPercentages = [];
        }

        this.loadingPortalPercent = false;
      },
      error: (err) => {
        this.portalPercentages = [];
        this.loadingPortalPercent = false;
      },
    });
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

  onSearchInput(ev: Event) {
    this.searchTerm = (ev.target as HTMLInputElement).value;
    this.search.emit(this.searchTerm);
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
  }

  togglePortalPopup() {
    this.isPortalOpen = !this.isPortalOpen;
  }

  private emitBalances() {
    this.balanceChange.emit({
      topup: this.topupBalance,
      payout: this.payoutBalance,
      reward: this.rewards,
      limit: this.limitRemainingAmount,
    });
  }
}
