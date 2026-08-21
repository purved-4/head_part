import { Component, Inject, OnInit, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from "@angular/router";
import { UserStateService } from "./store/user-state.service";
import { SocketConfigService } from "./pages/services/socket/socket-config.service";

@Component({
  selector: "app-root",
  template: `
    <div class="route-loader" [class.route-loader--visible]="isNavigating">
      <div class="route-loader__box">
        <div class="route-loader__ring route-loader__ring--outer"></div>
        <div class="route-loader__ring route-loader__ring--inner"></div>
        <div class="route-loader__dot"></div>
      </div>
    </div>
    <router-outlet></router-outlet>
    <app-loader></app-loader>
    <app-snackbar></app-snackbar>
  `,
  styles: [
    `
      .route-loader {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.55);
        backdrop-filter: blur(3px);
        opacity: 0;
        visibility: hidden;
        transition:
          opacity 0.2s ease,
          visibility 0.2s ease;
      }

      .route-loader--visible {
        opacity: 1;
        visibility: visible;
      }

      .route-loader__box {
        position: relative;
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .route-loader__ring {
        position: absolute;
        border-radius: 50%;
        border: 3px solid transparent;
      }

      .route-loader__ring--outer {
        width: 64px;
        height: 64px;
        border-top-color: #14b8a6;
        border-right-color: #14b8a6;
        animation: route-loader-spin 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      }

      .route-loader__ring--inner {
        width: 42px;
        height: 42px;
        border-bottom-color: #0d9488;
        border-left-color: #0d9488;
        animation: route-loader-spin-reverse 0.7s cubic-bezier(0.5, 0, 0.5, 1)
          infinite;
      }

      .route-loader__dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #14b8a6;
        animation: route-loader-pulse 0.9s ease-in-out infinite;
        box-shadow: 0 0 12px 2px rgba(20, 184, 166, 0.6);
      }

      @keyframes route-loader-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes route-loader-spin-reverse {
        to {
          transform: rotate(-360deg);
        }
      }

      @keyframes route-loader-pulse {
        0%,
        100% {
          transform: scale(0.7);
          opacity: 0.6;
        }
        50% {
          transform: scale(1.15);
          opacity: 1;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  title = "Online Dashboard";
  isNavigating = false;

  constructor(
    private userStateService: UserStateService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private socketConfigService: SocketConfigService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isNavigating = true;
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isNavigating = false;
      }
    });

    this.userStateService.currentUser$.subscribe((user) => {
      const role = user?.role?.[0]?.name || null;
      if (role) {
        document.documentElement.setAttribute("data-role", role.toLowerCase());
        this.socketConfigService.connect();
      } else {
        document.documentElement.removeAttribute("data-role");
        this.socketConfigService.destroyAll();
      }
    });
  }
}
