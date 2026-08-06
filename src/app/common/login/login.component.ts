import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../pages/services/auth.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { UserStateService } from "../../store/user-state.service";
import { SocketConfigService } from "../../pages/services/socket/socket-config.service";
import { AuthMemoryService } from "../../pages/services/auth-memory.service";
import { SubjectRegistryService } from "../../registery/subject-registry.service";
import { ChiefService } from "../../pages/services/chief.service";
import { isPlatformBrowser } from "@angular/common";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit {
  loginData = {
    email: "",
    password: "",
  };
  isMenuOpen = false;

  stats = [
    { title: "Balance", value: 0, target: 845620 },
    { title: "Savings", value: 0, target: 210000 },
    { title: "Income", value: 0, target: 125000 },
    { title: "Expenses", value: 0, target: 48200 },
    { title: "Investments", value: 0, target: 375000 },
  ];
  private publicRoutes = ["/register"];
  isCheckingAuth = true;
  showPassword = false;
  selfRegisterEnabled = false;
  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private snackbarService: SnackbarService,
    private userStateService: UserStateService,
    private socketConfigService: SocketConfigService,
    private memoryService: AuthMemoryService,
    private subjectService: SubjectRegistryService,
    private chiefService: ChiefService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeApp();

      this.userStateService.currentUser$.subscribe((user) => {
        const role = user?.role?.[0]?.name || null;

        if (role) {
          const normalizedRole = role.toLowerCase();
          document.documentElement.setAttribute("data-role", normalizedRole);
          this.socketConfigService.connect();
        } else {
          document.documentElement.removeAttribute("data-role");
          this.socketConfigService.destroyAll();
        }
      });
    }
    this.socketConfigService.destroyAll();
    this.memoryService.setAccessToken(null);
    this.userStateService.setCurrentUser(null);
    this.chiefService.checkSelfRegister().subscribe({
      next: (res: boolean) => {
        this.selfRegisterEnabled = res;
      },
      error: () => {
        this.selfRegisterEnabled = false;
      },
    });
    this.stats.forEach((stat) => {
      this.animate(stat);
    });
  }
  private initializeApp(): void {
    const currentUrl = window.location.pathname;

    // Welcome page — no auth check, show immediately
    if (currentUrl === "/") {
      this.isCheckingAuth = false;
      return;
    }
    if (currentUrl === "/open") {
      this.isCheckingAuth = false;
      return;
    }

    // Register page — no auth check, show immediately
    if (this.publicRoutes.some((r) => currentUrl.startsWith(r))) {
      this.isCheckingAuth = false;
      return;
    }

    // /login + all protected routes — check auth first, then show
    this.authService.getCurrentUser().subscribe({
      next: (res) => {
        this.userStateService.setCurrentUser(res);

        if (this.userStateService.getIsLoggedIn()) {
          const role = this.userStateService.getRole();
          if (currentUrl === "/login") {
            this.navigateToRoleHome(role);
          }
        }

        this.isCheckingAuth = false;
      },
      error: () => {
        this.userStateService.setCurrentUser(null);

        if (currentUrl !== "/" && !currentUrl.startsWith("/register")) {
          this.router.navigate(["/login"]);
        }

        this.isCheckingAuth = false;
      },
    });
  }
  animate(stat: any) {
    const increment = stat.target / 100;

    const timer = setInterval(() => {
      stat.value += increment;

      if (stat.value >= stat.target) {
        stat.value = stat.target;
        clearInterval(timer);
      }
    }, 20);
  }

  formSubmit() {
    if (!this.loginData.email || this.loginData.email.trim() === "") {
      this.snackbarService.show("Email is required !!", false, 4000);
      return;
    }

    if (!this.loginData.password || this.loginData.password.trim() === "") {
      this.snackbarService.show("Password is required !!", false, 4000);
      return;
    }

    this.authService.loginAndLoadUser(this.loginData).subscribe({
      next: (res: any) => {
        this.navigateToRoleHome(res?.role[0]?.name);
        this.snackbarService.show("Login Successful", true, 4000);
      },
      error: (err) => {
        // const msg =
        //   err?.error?.message ||
        //   err?.error?.error ||
        //   err?.message ||
        //   "Server error";
        // this.snackbarService.show(msg, false, 5000);
      },
    });
  }

  clearForm() {
    this.loginData = {
      email: "",
      password: "",
    };
    this.snackbarService.show("Form cleared", "success", 4000);
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

  toggleMobileMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
