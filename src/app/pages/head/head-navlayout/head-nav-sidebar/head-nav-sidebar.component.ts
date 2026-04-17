import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  HostListener,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { AuthService } from "../../../services/auth.service";
import { filter } from "rxjs/operators";
import { UserStateService } from "../../../../store/user-state.service";
import { BranchService } from "../../../services/branch.service";

interface MenuItem {
  label: string;
  route: string;
  icon?: string;
  expanded?: boolean;
  children?: MenuItem[];
  roles?: string[];
  notifications?: number;
}

@Component({
  selector: "app-head-nav-sidebar",
  templateUrl: "./head-nav-sidebar.component.html",
  styleUrl: "./head-nav-sidebar.component.css",
})
export class HeadNavSidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Output() toggleSidebar = new EventEmitter<boolean>();
  @ViewChild("secondaryPanel") secondaryPanel!: ElementRef;
  @Output() secondaryPanelStateChange = new EventEmitter<boolean>();

  @Input() isMobileOpen = false;
  @Output() closeMobileMenu = new EventEmitter<void>();

  currentUser: any;
  currentRoute = "";
  isMobileView = false;
  settingPopup = false;

  activeSubmenu: string | null = null;
  submenuContent: MenuItem | null = null;

  explicitlyOpened = false;

  hoverTimer: any;
  closeTimer: any;
  isSecondaryPanelHovering = false;
  recentItems: { label: string; route: string }[] = [];

  mainMargin = 80;
  managerId!: any;
  readonly PRIMARY_WIDTH_PX = 80;
  readonly PANEL_WIDTH_PX = 320;
  isMobileProfileOpen = false;
  menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      route: "/head/dashboard",
      icon: "dashboard",
      children: [{ label: "Dashboard", route: "/head/dashboard" }],
    },
    //new hai code ke sath mujhe bs yahi dena hai
    // {
    //   label: "Payment Management",
    //   route: "/head/payment-management",
    //   icon: "account_balance_wallet",
    //   children: [
    //     {
    //       label: "Payment Management",
    //       route: "/head/payment-management",
    //     },
    //     {
    //       label: "Recycle Management",
    //       route: "/head/recycle-management",
    //     },
    //   ],
    // },

    {
  label: "Payment Management",
  route: "/head/payments-methods", 
  icon: "account_balance_wallet",
  children: [
    {
      label: "Payment Management",
      route: "/head/payments-methods", 
    },
    {
      label: "Recycle Management",
      route: "/head/recycle-management",
    },
  ],
},
    // {
    //   label: "Bank Management",
    //   route: "/head/bank",
    //   icon: "account_balance",
    //   children: [
    //     { label: "Bank Management", route: "/head/bank" },
    //      { label: "Recycle Bank", route: "/head/recycle-bank" }
    //   ]
    // },
    // {
    //   label: "UPI Management",
    //   route: "/head/upi",
    //   icon: "qr_code",
    //   children: [
    //     { label: "UPI Management", route: "/head/upi" },
    //     { label: "Recycle UPI", route: "/head/recycle-upi" }
    //   ]
    // },
    // {
    //   label: "Capacity Management",
    //   route: "/head/capacity",
    //   icon: "inventory_2",
    //   children: [{ label: "Capacity Management", route: "/head/capacity" }],
    // },

    {
      label: "Chats",
      route: "/head/chats",
      icon: "chat",
      children: [{ label: "Chat", route: "/head/chat" }],
    },

    {
      label: "Limits",
      route: "/head/limit",
      icon: "credit_card",
      children: [{ label: "Limits", route: "/head/limit" }],
    },

    {
      label: "Branch Management",
      route: "/head/branch",
      icon: "business",
      children: [
        { label: "Add Branch", route: "/head/branch/add" },
        { label: "Manage Branch", route: "/head/branch/manage" },
      ],
    },

    {
      label: "Approved Funds",
      route: "/head/reports/funds/approved",
      icon: "task_alt",
      children: [
        {
          label: "UPI Reports",
          route: "/head/reports/funds/approved/upi",
          notifications: 2,
        },
        {
          label: "BANK Reports",
          route: "/head/reports/funds/approved/bank",
          notifications: 2,
        },
        {
          label: "PAYOUT Reports",
          route: "/head/reports/funds/approved/payout",
          notifications: 2,
        },
      ],
    },
    {
      label: "Rejected Funds",
      route: "/head/reports/funds/rejects",
      icon: "highlight_off",
      children: [
        {
          label: "UPI Reports",
          route: "/head/reports/funds/rejects/upi",
          notifications: 4,
        },
        {
          label: "BANK Reports",
          route: "/head/reports/funds/rejects/bank",
          notifications: 4,
        },

        {
          label: "PAYOUT Reports",
          route: "/head/reports/funds/rejects/payout",
          notifications: 4,
        },
      ],
    },

    {
      label: "Reports",
      route: "/head/reports",
      icon: "analytics",
      children: [
        {
          label: "Transaction History",
          route: "/head/reports/transaction-history",
        },
        { label: "Entity Report", route: "/head/reports/entity-report" },
        { label: "Funds Report", route: "/head/reports/funds-report" },
        { label: "Work Time", route: "/head/reports/work-time" },
        // { label: "Approved Funds", route: "/head/reports/funds/accepted" },
        // { label: "Rejected Funds", route: "/head/reports/funds/rejected" },
      ],
    },
  ];

  branchId: any;
  userId: any;
  user: any;
  activeSubmenuItem: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private BranchService: BranchService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit() {
    this.checkMobileView();
    this.secondaryPanelStateChange.emit(false);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // this.currentRoute = event.url;
        this.currentRoute = event.urlAfterRedirects;
        this.addToRecentItems(event.url);
        if (this.isMobileView) {
          this.closeSubmenu();
        }
      });

    this.currentRoute = this.router.url;
    this.loadRecentItems();

    // Simulate user data
    this.currentUser = {
      name: this.userStateService.getUserName(),
      email: this.userStateService.getRole(),
      role: "Head",
    };

    // initialize margin
    this.updateMainMargin();
  }

  // update mainMargin depending on explicit open state & collapsed
  updateMainMargin() {
    // if explicitly opened, move by primary + panel width
    if (this.explicitlyOpened) {
      this.mainMargin = this.PRIMARY_WIDTH_PX + this.PANEL_WIDTH_PX;
    } else {
      // when not explicitly opened, main area stays after primary sidebar only
      this.mainMargin = this.PRIMARY_WIDTH_PX;
    }
  }

  getCurrentPageTitle(): string {
    const currentItem = this.menuItems.find(
      (item) =>
        this.currentRoute === item.route ||
        (item.children &&
          item.children.some((child) => this.currentRoute === child.route)),
    );
    return currentItem?.label || "Dashboard";
  }

  getCurrentUserName(): string {
    return this.currentUser?.name || "Branch User";
  }

  getUserInitials(): string {
    const name = this.getCurrentUserName();
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  hasNotifications(item: MenuItem): boolean {
    return (item.notifications || 0) > 0;
  }

  getNotificationCount(item: MenuItem): number {
    return item.notifications || 0;
  }

  quickAction(action: string) {
    switch (action) {
      case "export":
        break;
      case "refresh":
        break;
      case "help":
        this.router.navigate(["/branch/help"]);
        break;
    }
  }

  saveSettings() {
    this.closeSettings();
  }

  addToRecentItems(route: string) {
    const allItems = this.getAllMenuItems();
    const item = allItems.find((i) => i.route === route);

    if (item && item.label !== "Dashboard") {
      const recentItem = { label: item.label, route: item.route };

      this.recentItems = this.recentItems.filter((r) => r.route !== route);
      this.recentItems.unshift(recentItem);

      if (this.recentItems.length > 3) {
        this.recentItems.pop();
      }

      localStorage.setItem(
        "sidebarRecentItems",
        JSON.stringify(this.recentItems),
      );
    }
  }

  getRecentItems() {
    return this.recentItems;
  }

  loadRecentItems() {
    const stored = localStorage.getItem("sidebarRecentItems");
    if (stored) {
      this.recentItems = JSON.parse(stored);
    }
  }

  getAllMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    this.menuItems.forEach((item) => {
      items.push(item);
      if (item.children) items.push(...item.children);
    });
    return items;
  }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    this.checkMobileView();
  }

  // checkMobileView() {
  //   this.isMobileView = window.innerWidth < 800;
  //   if (this.isMobileView) {
  //     this.collapsed = true;
  //     this.closeSubmenu();
  //   }
  // }
  checkMobileView() {
    if (typeof matchMedia !== "undefined") {
      this.isMobileView = matchMedia("(max-width: 800px)").matches;
    } else {
      this.isMobileView = false;
    }

    if (this.isMobileView) {
      this.collapsed = true;
      this.closeSubmenu();
    }
  }

  toggleSidebarCollapsed() {
    this.collapsed = !this.collapsed;
    this.toggleSidebar.emit(this.collapsed);
    if (this.collapsed) {
      this.closeSubmenu();
    }
    this.updateMainMargin();
  }

  onMenuItemEnter(item: MenuItem) {
    if (this.isMobileView || this.explicitlyOpened) return;
    clearTimeout(this.closeTimer);
    this.hoverTimer = setTimeout(() => {
      this.openSubmenu(item, false); // hover -> activeSubmenu true, explicit stays false
    }, 150);
  }

  onMenuItemLeave() {
    if (this.isMobileView || this.explicitlyOpened) return;
    clearTimeout(this.hoverTimer);
    if (!this.isSecondaryPanelHovering) {
      this.closeTimer = setTimeout(() => {
        this.closeSubmenu();
      }, 100);
    }
  }

  onPanelEnter() {
    if (this.isMobileView) return;
    this.isSecondaryPanelHovering = true;
    clearTimeout(this.closeTimer);
  }

  onPanelLeave() {
    if (this.isMobileView || this.explicitlyOpened) return;
    this.isSecondaryPanelHovering = false;
    this.closeTimer = setTimeout(() => {
      this.closeSubmenu();
    }, 100);
  }

  openSubmenuExplicit(item: MenuItem) {
    const willOpenExplicitly = !(
      this.explicitlyOpened && this.activeSubmenu === item.label
    );
    this.openSubmenu(item, willOpenExplicitly);
  }

  openSubmenu(item: MenuItem, isExplicit: boolean = false) {
    //  Do not open secondary panel on mobile
    if (this.isMobileView) return;
    this.activeSubmenuItem = item;

    if (this.activeSubmenu !== item.label) {
      this.activeSubmenu = item.label;
      this.submenuContent = item;
      this.explicitlyOpened = isExplicit;
      this.secondaryPanelStateChange.emit(this.explicitlyOpened); // emit
    } else if (isExplicit) {
      this.closeSubmenu();
      return;
    } else {
      this.explicitlyOpened = this.explicitlyOpened || false;
    }
    this.updateMainMargin();

    if (this.isMobileView && !this.collapsed) {
      this.collapsed = true;
      this.toggleSidebar.emit(true);
    }
  }

  closeSubmenu() {
    this.activeSubmenu = null;
    this.submenuContent = null;
    this.explicitlyOpened = false;
    this.isSecondaryPanelHovering = false;
    clearTimeout(this.hoverTimer);
    clearTimeout(this.closeTimer);
    this.updateMainMargin();
    this.secondaryPanelStateChange.emit(false); // emit closed
  }

  isActive(route: string): boolean {
    if (!route) return false;
    return this.currentRoute === route;
  }

  getActiveChildrenCount(): number {
    if (!this.submenuContent?.children) return 0;
    return this.submenuContent.children.filter((child) =>
      this.isActive(child.route),
    ).length;
  }

  //   isParentActive(item: MenuItem): boolean {
  //   if (!item) return false;
  //   return this.currentRoute === item.route;
  // }

  isParentActive(item: MenuItem): boolean {
    if (!item || !item.route) return false;

    // Exact match
    if (this.currentRoute === item.route) {
      return true;
    }

    // If it has children → check children match
    if (item.children && item.children.length > 0) {
      return item.children.some((child) =>
        this.currentRoute.startsWith(child.route),
      );
    }

    return false;
  }

  logout() {
    this.authService.logout();
  }

  openSettings() {
    this.settingPopup = true;
  }

  closeSettings() {
    this.settingPopup = false;
  }

  toggleCurrentSubmenu() {
    let item: MenuItem | undefined = this.activeSubmenuItem;

    if (!item) {
      item = this.menuItems.find((m) => this.isParentActive(m));
    }

    if (!item) {
      item = this.menuItems.find(
        (m) =>
          m.route === this.currentRoute ||
          (m.children && m.children.some((c) => c.route === this.currentRoute)),
      );
    }

    if (!item) {
      item = this.menuItems[0];
    }

    if (!item) return;

    this.openSubmenu(item, true);
  }

  getChildIcon(child: MenuItem): string {
    const route = child.route;

    const map: Record<string, string> = {
      // Dashboard
      "/head/dashboard": "dashboard",

      "/head/payment-management": "payments",
      "/head/recycle-management": "recycling",

      // Management
      "/head/upi": "qr_code_scanner", // Manage UPI
      "/head/recycle-upi": "restore_from_trash",
      "/head/bank": "settings_applications", // Manage Banks
      "/head/recycle-bank": "restore",
      "/head/capacity": "assignment", // Allocate Capacity

      // Chats
      "/head/chat": "chat",
      "/head/chat/head": "chat",
      "/head/chat/branch": "forum",

      // Limits
      "/head/limit": "credit_card",

      // Branch
      "/head/branch/add": "add_business",
      "/head/branch/manage": "business_center",

      // Reports
      "/head/reports/transaction-history": "history",
      "/head/reports/entity-report": "assignment",
      "/head/reports/funds-report": "pie_chart",
      "/head/reports/work-time": "schedule",

      // Approved Funds
      "/head/reports/funds/approved/upi": "payment",
      "/head/reports/funds/approved/bank": "account_balance",
      "/head/reports/funds/approved/payout": "paid",

      // Rejected Funds
      "/head/reports/funds/rejects/upi": "payment",
      "/head/reports/funds/rejects/bank": "account_balance",
      "/head/reports/funds/rejects/payout": "paid",
    };

    return map[route] || "chevron_right";
  }

  // --- Replace the existing getMenuIcon method with this ---
  getMenuIcon(icon?: string): string {
    return icon || "dashboard";
  }

  // Add this method

  // Add this method to handle menu item clicks
  handleMenuItemClick(item: MenuItem) {
    // MOBILE BEHAVIOR
    if (this.isMobileOpen) {
      // If item has children → toggle dropdown
      if (item.children && item.children.length > 0) {
        item.expanded = !item.expanded;
        return;
      }

      // If no children → navigate and close mobile menu
      this.router.navigate([item.route]);
      this.closeMobileMenu.emit();
      return;
    }

    // DESKTOP BEHAVIOR
    // If item has no children → navigate
    if (!item.children || item.children.length === 0) {
      this.router.navigate([item.route]);
      return;
    }

    // If item has children → open submenu
    this.openSubmenu(item, true);
  }

  handleProfileClick() {
    if (this.isMobileOpen) {
      this.isMobileProfileOpen = true;
      return;
    }

    // Desktop behavior
    this.toggleCurrentSubmenu();
    this.explicitlyOpened = !this.explicitlyOpened;
  }

  @HostListener("document:click", ["$event"])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;

    if (!target.closest(".profile-dropdown")) {
      this.explicitlyOpened = false;
    }
  }
}
