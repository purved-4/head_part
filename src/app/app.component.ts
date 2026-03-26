import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { AuthService } from "./pages/services/auth.service";
import { UserStateService } from "./store/user-state.service";
import { Router } from "@angular/router";
import { SocketConfigService } from "./pages/services/socket/socket-config.service";

@Component({
  selector: "app-root",
  template: `
    <router-outlet></router-outlet>
    <app-snackbar></app-snackbar>
  `,
})
export class AppComponent implements OnInit {
  title = "Online Dashboard";

  private publicRoutes = ["/register"];

  constructor(
    private authService: AuthService,
    private userStateService: UserStateService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private socketConfigService: SocketConfigService,
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeApp();
    }
  }
//   ngOnDestroy() {
//   this.socketConfigService.destroyAll();
// }

  private initializeApp(): void {
    const currentUrl = window.location.pathname;

    const isPublicRoute = this.publicRoutes.some((route) =>
      currentUrl.startsWith(route),
    );

    if (isPublicRoute) return;

    this.authService.getCurrentUser().subscribe({
      next: (res) => {
        this.userStateService.setCurrentUser(res);

        if (this.userStateService.getIsLoggedIn()) {
          const role = this.userStateService.getRole();
          const normalizedRole = (role ?? "").toLowerCase();

          // ✅ Set role attribute for layout styling
          document.documentElement.setAttribute("data-role", normalizedRole);

          // ✅ Redirect ONLY if user is on root "/"
          if (currentUrl === "/") {
            this.navigateToRoleHome(role);
          }

          // ✅ Connect socket after login
          this.socketConfigService.connect();
        }
      },
      error: () => {
        this.userStateService.setCurrentUser(null);
        this.socketConfigService.destroyAll()
        this.router.navigate(["/"]);
      },
    });
  }

  private navigateToRoleHome(role: any): void {
    const r = (role ?? "").toUpperCase();

    switch (r) {
      case "OWNER":
        this.router.navigate(["/owner"]);
        break;
      case "CHIEF":
        this.router.navigate(["/chief"]);
        break;
      case "BRANCH":
        this.router.navigate(["/branch"]);
        break;
      case "HEAD":
        this.router.navigate(["/head"]);
        break;
      case "MANAGER":
        this.router.navigate(["/manager"]);
        break;
      case "COM_PART":
        this.router.navigate(["/comPart"]);
        break;
      default:
        this.router.navigate(["/"]);
    }
  }

  
}
