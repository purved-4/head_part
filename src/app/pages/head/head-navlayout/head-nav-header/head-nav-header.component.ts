import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { Router } from "@angular/router";
import { LimitsService } from "../../../services/reports/limits.service";
import { UserStateService } from "../../../../store/user-state.service";
import { SocketConfigService } from "../../../../common/socket/socket-config.service";
import { FundsService } from "../../../services/funds.service";
import { ChiefService } from "../../../services/chief.service";
import { HeadService } from "../../../services/head.service";
import { NotificateChatComponent } from "../../../../common/notificate-chat/notificate-chat.component";

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

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
  @Output() search = new EventEmitter<string>();

  isProfileOpen = false;
  @ViewChild("profileContainer") profileContainer!: ElementRef;
  @ViewChild("websiteButton") websiteButtonRef!: ElementRef; // Added for modal click exclusion
  @ViewChild(NotificateChatComponent)
  notificationChat!: NotificateChatComponent;

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
  websitePopupOpen = false;
  websitePercentages: any[] = [];
  loadingWebsitePercent = false;

  constructor(
    private limitService: LimitsService,
    private userStateService: UserStateService,
    private socketService: SocketConfigService,
    private fundService: FundsService,
    private headServices: HeadService,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.currentUserRole = this.userStateService.getRole();
    console.log("RoleId:", this.currentRoleId);

    this.socketService.subscribeLatestBalance(this.currentRoleId);

    this.socketService.getLatestBalance().subscribe((res) => {
      console.log(res);
      if (res?.data?.remainingAmount !== undefined) {
        this.limitRemainingAmount = res.data.remainingAmount;
      }
    });

    this.fundService
      .broadcast(this.currentRoleId, this.currentUserRole)
      .subscribe((res) => {
        this.payoutBalance = res.ACCEPTED_CURRENCY_PAYOUT;
        this.upiBalance = res.ACCEPTED_CURRENCY_UPI;
        this.bankBalance = res.ACCEPTED_CURRENCY_BANK;
        this.rewards = res.Branch_Balance;
        this.topupBalance = this.upiBalance + this.bankBalance;
      });

    this.limitService
      .getLatestLimitsByEntityAndType(this.currentRoleId, this.currentUserRole)
      .subscribe((res) => {
        this.limitRemainingAmount = res.remainingAmount;
      });
  }

  // Open website popup
  openWebsitePopup() {
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    console.log("Opening popup with roleId:", this.currentRoleId);

    if (!this.currentRoleId) {
      console.warn("RoleId not ready yet");
      return;
    }

    this.websitePopupOpen = true;
    this.websitePercentages = [];
    this.loadWebsitePercentages();
  }

  // Close website popup
  closeWebsitePopup() {
    this.websitePopupOpen = false;
  }

  // Load API data
  loadWebsitePercentages() {
    this.loadingWebsitePercent = true;

    this.headServices.getHeadWebsitePercentage(this.currentRoleId).subscribe({
      next: (res: any) => {
        console.log("API RAW Response:", res);

        if (Array.isArray(res)) {
          this.websitePercentages = res;
        } else if (res?.data && Array.isArray(res.data)) {
          this.websitePercentages = res.data;
        } else {
          this.websitePercentages = [];
        }

        console.log("Final websitePercentages:", this.websitePercentages);
        this.loadingWebsitePercent = false;
      },
      error: (err) => {
        console.error("API ERROR:", err);
        this.websitePercentages = [];
        this.loadingWebsitePercent = false;
      },
    });
  }

  // Refresh data
  refreshWebsiteData() {
    this.loadWebsitePercentages();
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
    if (this.websitePopupOpen) this.closeWebsitePopup();
  }

  // Combined HostListener for clicks outside
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    // Close profile if click outside
    if (this.isProfileOpen && this.profileContainer) {
      const clickedInside = this.profileContainer.nativeElement.contains(
        event.target,
      );
      if (!clickedInside) {
        this.closeProfile();
      }
    }

    // Close website modal if click outside (and not on the button that opens it)
    if (this.websitePopupOpen) {
      const modal = document.querySelector(".website-modal-card");
      const isClickOnButton = this.websiteButtonRef?.nativeElement.contains(
        event.target,
      );
      if (modal && !modal.contains(event.target as Node) && !isClickOnButton) {
        this.closeWebsitePopup();
      }
    }
  }
}
