import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from "@angular/core";
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
export class LoginComponent implements OnInit, OnDestroy {
  loginData = {
    email: "",
    password: "",
  };
  isMenuOpen = false;
  rememberMe = false;

  // NOTE: kept from the original component — no longer rendered on this
  // screen, left intact in case another view still binds to it.
  stats = [
    { title: "Balance", value: 0, target: 845620 },
    { title: "Savings", value: 0, target: 210000 },
    { title: "Income", value: 0, target: 125000 },
    { title: "Expenses", value: 0, target: 48200 },
    { title: "Investments", value: 0, target: 375000 },
  ];

  // Dummy content for the "New to Lazerpay?" quick links
  helpLinks = [
    { label: "How to Register" },
    { label: "Add Inventory" },
    { label: "How Account Work" },
  ];

  // ---- Offers carousel ----
  offers = [
    {
      icon: "sell",
      iconBg: "bg-blue-100",
      bg: "bg-blue-50",
      title: "Referral Rewards",
      description: "Invite and earn rewards for every successful referral.",
    },
    {
      icon: "bolt",
      iconBg: "bg-green-100",
      bg: "bg-green-50",
      title: "Higher Rewards",
      description:
        "Earn higher rewards on every eligible transaction you process.",
    },
    {
      icon: "receipt_long",
      iconBg: "bg-orange-100",
      bg: "bg-orange-50",
      title: "Instant Statements",
      description:
        "Get settlements in T+1 business days, straight to your account.",
    },
    {
      icon: "target",
      iconBg: "bg-purple-100",
      bg: "bg-purple-50",
      title: "Cashback Bonus",
      description: "Unlock cashback on every milestone you hit this month.",
    },
  ];
  // rendered track = offers doubled up, so the loop can slide seamlessly
  // past the "end" before jumping back to the real start
  offersLoop = [...this.offers, ...this.offers];

  cardWidth = 270;
  cardGap = 20;
  currentIndex = 0;
  trackTransform = "translateX(0px)";
  trackTransitionEnabled = true;

  private autoplayTimer: any;
  private readonly AUTOPLAY_MS = 3000;
  private readonly TRANSITION_MS = 600;

  get activeDotIndex(): number {
    return this.currentIndex % this.offers.length;
  }

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
      // page should always open at the top, not wherever the last
      // page's scroll position was
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

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

      this.startAutoplay();
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

  ngOnDestroy(): void {
    clearInterval(this.autoplayTimer);
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
        this.snackbarService.show(err.error?.message, false, 4000);
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

  forgotPassword() {
    this.snackbarService.show(
      "Password reset flow coming soon",
      "success",
      3000,
    );
  }

  playTutorialVideo() {
    this.snackbarService.show("Tutorial video coming soon", "success", 3000);
  }

  // ---- Offers carousel: auto-loop ----
  private startAutoplay() {
    clearInterval(this.autoplayTimer);
    this.autoplayTimer = setInterval(() => this.nextOffer(), this.AUTOPLAY_MS);
  }

  pauseAutoplay() {
    clearInterval(this.autoplayTimer);
  }

  resumeAutoplay() {
    this.startAutoplay();
  }

  private setTransform(animate: boolean) {
    this.trackTransitionEnabled = animate;
    const offset = this.currentIndex * (this.cardWidth + this.cardGap);
    this.trackTransform = `translateX(-${offset}px)`;
  }

  nextOffer() {
    this.currentIndex++;
    this.setTransform(true);

    // once we've slid past the (duplicated) end, snap back to the real
    // start with no transition — this is what makes the loop seamless
    if (this.currentIndex >= this.offers.length) {
      setTimeout(() => {
        this.currentIndex = 0;
        this.setTransform(false);
      }, this.TRANSITION_MS + 20);
    }
  }

  prevOffer() {
    if (this.currentIndex === 0) {
      this.currentIndex = this.offers.length;
      this.setTransform(false);
      setTimeout(() => {
        this.currentIndex = this.offers.length - 1;
        this.setTransform(true);
      }, 20);
    } else {
      this.currentIndex--;
      this.setTransform(true);
    }
  }

  goToOffer(i: number) {
    this.currentIndex = i;
    this.setTransform(true);
    this.resumeAutoplay();
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
