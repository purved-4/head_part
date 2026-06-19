import { Component, HostListener } from "@angular/core";

@Component({
  selector: "app-head-nav-dashboard-layout",
  templateUrl: "./head-nav-dashboard-layout.component.html",
  styleUrls: ["./head-nav-dashboard-layout.component.css"],
})
export class HeadNavDashboardLayoutComponent {
  // ================= BALANCES =================
  headerPayin = 0;
  headerPayout = 0;
  headerReward = 0;
  headerLimit = 0;

  // ================= SIDEBAR =================
  sidebarCollapsed = false;
  secondaryPanelOpen = false;
  mobileMenuOpen = false;

  // ================= SETTINGS =================
  showSettings = false;

  // ================= CHAT =================
  showPendingThreads = false;
  chatPanelOpen = false;

  entityId: any;
  entityType: any;

  // ================= HEADER =================
  pageTitle = "Dashboard";
  userName = "John Doe";

  // ================= WIDTHS =================
  readonly PRIMARY_WIDTH = 80;
  readonly PANEL_WIDTH = 320;
  readonly CHAT_PANEL_WIDTH = 380;

  // ================= NOTIFICATION =================
  isNotificationSidebarOpen = false;
  notificationUnreadCount = 0;

  // ================= LEFT MARGIN =================
  get mainLeftMargin(): number {
    if (this.isMobileView()) {
      return 0;
    }

    return (
      this.PRIMARY_WIDTH +
      (this.secondaryPanelOpen ? this.PANEL_WIDTH : 0)
    );
  }

  // ================= RIGHT MARGIN =================
  get mainRightMargin(): number {
    if (this.isMobileView()) {
      return 0;
    }

    return this.chatPanelOpen
      ? this.CHAT_PANEL_WIDTH
      : 0;
  }

  // ================= MOBILE =================
  isMobileView(): boolean {
    return (
      typeof matchMedia !== "undefined" &&
      matchMedia("(max-width: 800px)").matches
    );
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;

    if (this.mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = "";
  }

  // ================= SIDEBAR =================
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSecondaryPanelChange(open: boolean): void {
    this.secondaryPanelOpen = open;
  }

  // ================= SETTINGS =================
  openSettings(): void {
    this.showSettings = true;
  }

  closeSettings(): void {
    this.showSettings = false;
  }

  // ================= SEARCH =================
  onSearch(term: string): void {
    // handle search
  }

  // ================= BALANCE =================
  onBalanceChange(data: any) {
    this.headerPayin = data.payin;
    this.headerPayout = data.payout;
    this.headerReward = data.reward;
    this.headerLimit = data.limit;
  }

  // ================= NOTIFICATION =================
  openNotificationSidebar() {
    this.isNotificationSidebarOpen = true;
  }

  closeNotificationSidebar() {
    this.isNotificationSidebarOpen = false;
  }

  onUnreadCountChange(count: any) {
    if (count && typeof count === "object" && count.target) {
      this.notificationUnreadCount = count.target.value;
    } else {
      this.notificationUnreadCount = count;
    }
  }

  // ================= CHAT PANEL =================
  onChatPanelStateChange(isOpen: boolean): void {
    this.chatPanelOpen = isOpen;
  }

  closePendingThreads(): void {
    this.showPendingThreads = false;
  }

  // ================= WINDOW RESIZE =================
  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    if (!this.isMobileView() && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  // ================= OLD NOTIFICATION =================
  notificationOpen = false;

  toggleNotification() {
    this.notificationOpen = !this.notificationOpen;
  }

  closeNotification() {
    this.notificationOpen = false;
  }
}