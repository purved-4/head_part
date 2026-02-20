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
import { UserStateService} from "../../../../store/user-state.service";
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


  currentUser: any;
  currentRoute = "";
  isMobileView = false;
  settingPopup = false;

  activeSubmenu: string | null = null;
  submenuContent: MenuItem | null = null;

  explicitlyOpened = false; // only true when clicked to open

  hoverTimer: any;
  closeTimer: any;
  isSecondaryPanelHovering = false;
  recentItems: { label: string; route: string }[] = [];

  mainMargin = 80;
managerId! :any
  readonly PRIMARY_WIDTH_PX = 80; // tailwind w-20 = 5rem = 80px
  readonly PANEL_WIDTH_PX = 320; // tailwind w-80 = 20rem = 320px

// menuItems: MenuItem[] = [
//   {
//     label: "Dashboard",
//     route: "/manager/dashboard",
//     icon: "dashboard",
//     children: [
//       { label: "Dashboard", route: "/manager/dashboard" }
//     ]
//   },

//   {
//     label: "Head Management",
//     route: "/manager/head",
//     icon: "manage_accounts",
//     children: [
//       { label: "Add Head", route: "/manager/head/add" },
//       { label: "Manage Head", route: "/manager/head/manage" }
//     ]
//   },

//   // 🔥 CHATS (Head + Branch inside)
//   {
//     label: "Chats",
//     route: "/manager/chats",
//     icon: "chat",
//     children: [
//       { label: "Head Chat", route: "/manager/head-chat" },
//       { label: "Branch Chat", route: "/manager/branch-chat" }
//     ]
//   },

//   {
//     label: "Limits",
//     route: "/manager/limit",
//     icon: "account_balance_wallet",
//     children: [
//       { label: "Limits", route: "/manager/limit" }
//     ]
//   },

//   {
//     label: "Reports",
//     route: "/manager/reports",
//     icon: "analytics",
//     children: [
//       { label: "Transaction History", route: "/manager/reports/transaction-history" },
//       { label: "Entity Report", route: "/manager/reports/entity-report" },
//       { label: "Funds Report", route: "/manager/reports/funds-report" },
//       { label: "Work Time", route: "/manager/reports/work-time" }
//     ]
//   }
// ];

menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    route: "/head",
    icon: "dashboard",
    children: [
      { label: "Dashboard", route: "/head" }
    ]
  },

  {
    label: "UPI Management",
    route: "/head/upi",
    icon: "qr_code",
    children: [
      { label: "UPI Management", route: "/head/upi" }
    ]
  },

  {
    label: "Bank Management",
    route: "/head/bank",
    icon: "account_balance",
    children: [
      { label: "Bank Management", route: "/head/bank" }
    ]
  },

  {
    label: "Capacity Management",
    route: "/head/capacity",
    icon: "inventory_2",
    children: [
      { label: "Capacity Management", route: "/head/capacity" }
    ]
  },

  {
    label: "Chats",
    route: "/head/chats",
    icon: "chat",
    children: [
      { label: "Head Chat", route: "/head/head-chat" },
      { label: "Branch Chat", route: "/head/branch-chat" }
    ]
  },

  {
    label: "Limits",
    route: "/head/limit",
    icon: "credit_card",
    children: [
      { label: "Limits", route: "/head/limit" }
    ]
  },

  {
    label: "Branch Management",
    route: "/head/branch",
    icon: "business",
    children: [
      { label: "Add Branch", route: "/head/branch/add" },
      { label: "Manage Branch", route: "/head/branch/manage" }
    ]
  },

  {
    label: "Reports",
    route: "/head/reports",
    icon: "analytics",
    children: [
      { label: "Transaction History", route: "/head/reports/transaction-history" },
      { label: "Entity Report", route: "/head/reports/entity-report" },
      { label: "Funds Report", route: "/head/reports/funds-report" },
      { label: "Work Time", route: "/head/reports/work-time" },
      { label: "Approved Funds", route: "/head/reports/funds/accepted" },
      { label: "Rejected Funds", route: "/head/reports/funds/rejected" }
    ]
  }
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
     this.userId = this.userStateService.getUserId();
   this.managerId = this.userStateService.getmanagerId();
    const userId = this.userStateService.getUserId();
    const branchId = this.userStateService.getBranchId();
    this.branchId = branchId;
    this.userId = userId;
    this.checkMobileView();
    this.secondaryPanelStateChange.emit(false)

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.addToRecentItems(event.url);
        if (this.isMobileView) {
          this.closeSubmenu();
        }
      });

    this.currentRoute = this.router.url;
    this.loadRecentItems();

    // Simulate user data
    this.currentUser = {
      name: "John Doe",
      email: "john.doe@branch.com",
      role: "Branch Manager",
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
        console.log("Exporting data...");
        break;
      case "refresh":
        console.log("Refreshing cache...");
        break;
      case "help":
        this.router.navigate(["/branch/help"]);
        break;
    }
  }

  saveSettings() {
    console.log("Saving settings...");
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

  checkMobileView() {
    this.isMobileView = window.innerWidth < 768;
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

  
navigate(route: string) {
  if (!route) return;

  // Dashboard with params
  if (route === "/head/dashboard" && this.managerId && this.userId) {
    this.router.navigate(["/head/dashboard", this.managerId, this.userId]);
  }

  // Add Branch with params
  else if (route === "/head/branch/add" && this.managerId && this.userId) {
    this.router.navigate(["/head/branch/add", this.managerId, this.userId]);
  }

  // Manage Branch with params
  else if (route === "/head/branch/manage" && this.managerId && this.userId) {
    this.router.navigate(["/head/branch/manage", this.managerId, this.userId]);
  }

  // Normal routes
  else {
    this.router.navigate([route]);
  }

  if (!this.explicitlyOpened) {
    setTimeout(() => this.closeSubmenu(), 100);
  }

  if (this.isMobileView) {
    this.collapsed = true;
    this.toggleSidebar.emit(true);
    this.closeSubmenu();
  }
}



  isActive(route: string): boolean {
    if (!route) return false;
    return this.currentRoute === route;
  }

//   isActive(route: string): boolean {
//   if (!route) return false;
//   return (
//     this.currentRoute === route ||
//     this.currentRoute.startsWith(route + "/")
//   );
// }


  getActiveChildrenCount(): number {
    if (!this.submenuContent?.children) return 0;
    return this.submenuContent.children.filter((child) =>
      this.isActive(child.route),
    ).length;
  }

  // isParentActive(item: MenuItem): boolean {
  //   if (!item) return false;
  //   if (this.isActive(item.route)) return true;
  //   if (item.children && item.children.length) {
  //     return item.children.some((child) => this.isActive(child.route));
  //   }
  //   return false;
  // }

  isParentActive(item: MenuItem): boolean {
  if (!item) return false;
  return this.currentRoute === item.route;
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

  // getChildIcon(child: MenuItem, parentLabel: string): string {
  //   const label = (child.label || "").trim();

  //   const iconMap: { [key: string]: string } = {
  //     "Add Chief": "person_add",
  //     "Manage Chief": "manage_accounts",
  //     "Add Website": "add",
  //     "Manage Website": "language",
  //     "Head Chat": "chat",
  //     "Branch Chat": "forum",
  //     "Head Funds": "account_balance_wallet",
  //     "Branch Funds": "savings",
  //     "Time Setup": "schedule",
  //     "Limit Setup": "tune",
  //     "Transaction History": "history",
  //     "Entity Reports": "assignment",
  //     "Funds Reports": "pie_chart",
  //     "Amount Percentage": "percent",
  //     "Work Time": "access_time",
  //     "CB Reports": "bar_chart",
  //     Dashboard: "dashboard",
  //     Chat: "chat",
  //   };

  //   return iconMap[label] || "chevron_right";
  // }

  getChildIcon(child: MenuItem): string {
  const route = child.route;

  const map: Record<string, string> = {
    "/head/dashboard": "dashboard",

    "/head/upi": "qr_code",
    "/head/bank": "account_balance",
    "/head/capacity": "inventory_2",

    "/head/head-chat": "chat",
    "/head/branch-chat": "forum",

    "/head/limit": "credit_card",

    "/head/branch/add": "add_business",
    "/head/branch/manage": "business_center",

    "/head/reports/transaction-history": "history",
    "/head/reports/entity-report": "assignment",
    "/head/reports/funds-report": "pie_chart",
    "/head/reports/work-time": "schedule",
    "/head/reports/funds/accepted": "check_circle",
    "/head/reports/funds/rejected": "cancel",
  };

  return map[route] || "chevron_right";
}


  // --- Replace the existing getMenuIcon method with this ---
  getMenuIcon(icon?: string): string {
  return icon || "dashboard";
}

}

