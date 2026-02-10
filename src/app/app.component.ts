import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { AuthService } from "./pages/services/auth.service";
import { UserStateService } from "./store/user-state.service";
import { Router } from "@angular/router";
import { SocketConfigService } from "./common/socket/socket-config.service";

@Component({
  selector: "app-root",
  template: `
    <router-outlet></router-outlet>
    <app-snackbar></app-snackbar>
  `,
})
export class AppComponent implements OnInit {
  title = "Online Dashboard";

  constructor(
    private authService: AuthService,
    private userStateService: UserStateService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private socketConfigService: SocketConfigService,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserOnBrowserOnly();
    }
  }

  private loadUserOnBrowserOnly() {
    this.authService.getCurrentUser().subscribe({
      next: (res) => {
        this.userStateService.setCurrentUser(res);

        if (this.userStateService.getIsLoggedIn()) {
          const role = this.userStateService.getRole();
          this.redirectByRole(role);

          const roleId = this.userStateService.getCurrentRoleId();
          if (roleId) {
            this.socketConfigService.connect({ branchId: roleId });
          } else {
            console.warn("No roleId found for socket connect.");
          }
        } else {
          this.router.navigate(["/login"]);
        }
      },
      error: (err) => {
        this.userStateService.setCurrentUser(null);
        this.router.navigate(["/login"]);
      },
    });
  }

  private redirectByRole(role: any) {
    const r = (role ?? "").toUpperCase();
    console.log("reloade pa data aa rha hia");
    
    document.documentElement.setAttribute('data-role', role?.toLocaleLowerCase());


    switch (r) {
      case "HEAD":
        this.router.navigate(["/head"]);
        break;
      default:
        this.router.navigate(["/login"]);
    }
  }
}
