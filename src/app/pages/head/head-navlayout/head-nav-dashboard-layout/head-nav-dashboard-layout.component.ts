import { Component } from '@angular/core';
import { HostListener } from '@angular/core';
@Component({
  selector: 'app-head-nav-dashboard-layout',
  templateUrl: './head-nav-dashboard-layout.component.html',
  styleUrls: ['./head-nav-dashboard-layout.component.css']
})
export class HeadNavDashboardLayoutComponent {

headerTopup = 0;
headerPayout = 0;
headerReward = 0;
headerLimit = 0;
 sidebarCollapsed = false;
  secondaryPanelOpen = false;
  mobileMenuOpen = false;
  showSettings = false;
  pageTitle = 'Dashboard';
  userName = 'John Doe';

  readonly PRIMARY_WIDTH = 80;
  readonly PANEL_WIDTH = 320;

  get mainMargin(): number {
    // On mobile, no margin
    if (this.isMobileView()) {
      return 0;
    }
    // Desktop view
    return this.PRIMARY_WIDTH + (this.secondaryPanelOpen ? this.PANEL_WIDTH : 0);
  }

  // isMobileView(): boolean {
  //   return window.innerWidth <= 800;
  // }

isMobileView(): boolean {
  return typeof matchMedia !== 'undefined' &&
         matchMedia('(max-width: 800px)').matches;
}

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSecondaryPanelChange(open: boolean): void {
    this.secondaryPanelOpen = open;
  }

  openSettings(): void {
    this.showSettings = true;
  }

  closeSettings(): void {
    this.showSettings = false;
  }

  onSearch(term: string): void {
    // handle search
  }

  onBalanceChange(data: any) {
  this.headerTopup = data.topup;
  this.headerPayout = data.payout;
  this.headerReward = data.reward;
  this.headerLimit = data.limit;
}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (!this.isMobileView() && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  notificationOpen = false;

toggleNotification() {
  this.notificationOpen = !this.notificationOpen;
}

closeNotification() {
  this.notificationOpen = false;
}


// Add these properties with your existing ones
isNotificationSidebarOpen = false;
notificationUnreadCount = 0;

// Add these methods
openNotificationSidebar() {
  this.isNotificationSidebarOpen = true;
}

closeNotificationSidebar() {
  this.isNotificationSidebarOpen = false;
}

onUnreadCountChange(count: any) {
  if (count && typeof count === 'object' && count.target) {
    this.notificationUnreadCount = count.target.value;
  } else {
    this.notificationUnreadCount = count;
  }
}
}

