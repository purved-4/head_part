import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  HostListener,
} from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { filter } from "rxjs/operators";
import { ChiefService } from "../../services/chief.service";
import { HeadService } from "../../services/head.service";
import { ManagerService } from "../../services/manager.service";
import { UserStateService } from "../../../store/user-state.service";

interface MenuItem {
  label: string;
  route: string;
  expanded?: boolean;
  children?: MenuItem[];
}

@Component({
  selector: "head-sidebar",
  templateUrl: "./head-sidebar.component.html",
  styleUrls: ["./head-sidebar.component.css"],
})
export class HeadSidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Output() toggleSidebar = new EventEmitter<boolean>();

  currentUser: any = "branch";
  currentRoute = "";
  isMobileView = false;
  managerId: any;
  userId: any;

  // Menu items as individual objects for easier management
  userManagementItem: MenuItem = {
    label: "User Management",
    route: "/head/user-management",
    expanded: false,
    children: [
      { label: "Add User", route: "/head/branch/add" },
      { label: "Manage User", route: "/head/branch/manage" },
    ],
  };
  head: any;
  user: any;

  ReportItem: MenuItem = {
    label: "Report Management",
    route: "/admin/reports",
    expanded: false,
    children: [
      {
        label: "Transaction History",
        route: "/head/reports/transaction-history",
      },
      { label: "Website Wise", route: "/head/reports/website-wise" },
      { label: "Downline Billing", route: "/head/reports/downleve-billing" },
      { label: "Reward", route: "/head/reports/reward" },
      { label: "Timing & Rejection", route: "/head/reports/timing-rejection" },
      { label: "Approval (By Site)", route: "/head/reports/approval" },
    ],
  };
  sidebarWidth: number = 384; // Initial width matching w-96
  settingPopup: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private headService: HeadService,
    private ManagerService: ManagerService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit() {
    this.checkMobileView();
    this.userId = this.userStateService.getUserId();
    this.managerId = this.userStateService.getCurrentRoleId();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });
  }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    this.checkMobileView();
  }

  checkMobileView() {
    this.isMobileView = window.innerWidth < 768;
    if (this.isMobileView) {
      this.collapsed = true;
    }
  }

  toggleSidebarCollapsed() {
    this.collapsed = !this.collapsed;
    this.toggleSidebar.emit(this.collapsed);
  }

  hasPermission(item: any): boolean {
    if (!item.roles) return true;
    if (!this.currentUser) return false;
    return item.roles.includes(this.currentUser.role);
  }

  toggleSubmenu(item: MenuItem) {
    if (this.collapsed) return;
    item.expanded = !item.expanded;
  }

  navigate(route: string) {
    this.router.navigate([route]);
    if (this.isMobileView) {
      this.collapsed = true;
      this.toggleSidebar.emit(true);
    }
  }

  navigateToDashboard() {
    if (this.managerId && this.userId) {
      // route: /head/branch/add/:managerId/:userId
      this.router.navigate(["/head/dashboard", this.managerId, this.userId]);
    } else {
      console.error(
        "head ID or User ID not available - falling back to base route",
      );
      // Fallback to base route if IDs are not available
      // this.router.navigate(["/head/branch/add"]);
    }

    if (this.isMobileView) {
      this.collapsed = true;
      this.toggleSidebar.emit(true);
    }
  }

  // Navigate to Add User using path params (matches route: add/:managerId/:userId)
  navigateToAddUser() {
    if (this.managerId && this.userId) {
      // route: /head/branch/add/:managerId/:userId
      this.router.navigate(["/head/branch/add", this.managerId, this.userId]);
    } else {
      console.error(
        "head ID or User ID not available - falling back to base route",
      );
      // Fallback to base route if IDs are not available
      this.router.navigate(["/head/branch/add"]);
    }

    if (this.isMobileView) {
      this.collapsed = true;
      this.toggleSidebar.emit(true);
    }
  }

  navigateToChat() {
    if (this.managerId && this.userId) {
      // route: /head/branch/add/:managerId/:userId
      this.router.navigate(["/head/chat"]);
    } else {
      console.error(
        "head ID or User ID not available - falling back to base route",
      );
      // Fallback to base route if IDs are not available
      this.router.navigate(["/head/branch/add"]);
    }

    if (this.isMobileView) {
      this.collapsed = true;
      this.toggleSidebar.emit(true);
    }
  }

  // Navigate to Manage User using path params (matches route: manage/:managerId/:userId)
  navigateToManageUser() {
    if (this.managerId && this.userId) {
      // route: /head/branch/manage/:managerId/:userId
      this.router.navigate([
        "/head/branch/manage",
        this.managerId,
        this.userId,
      ]);
    } else {
      console.error(
        "head ID or User ID not available - falling back to base route",
      );
      // Fallback to base route if IDs are not available
      this.router.navigate(["/head/branch/manage"]);
    }

    if (this.isMobileView) {
      this.collapsed = true;
      this.toggleSidebar.emit(true);
    }
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }

  isParentActive(item: MenuItem): boolean {
    if (this.isActive(item.route)) return true;
    if (item.children) {
      return item.children.some((child) => this.isActive(child.route));
    }
    return false;
  }

  getFirstLetter(username: string): string {
    return username ? username.toUpperCase() : "U";
  }

  logout() {
    this.authService.logout();
  }

  onSidebarWidthChange(width: any): void {
    this.sidebarWidth = width;
  }

  openSettings() {
    this.settingPopup = true;
  }

  closeSettings() {
    this.settingPopup = false;
  }
}
