import { Component, ElementRef, HostListener, OnDestroy } from "@angular/core";
import { UserStateService } from "../../store/user-state.service";
import { ChiefManualService } from "../../pages/services/chief-manual.service";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { CurrentUser } from "../../store/current-user-model";

interface DashboardConfig {
  label: string;
  route: string;
  notifications?: number;
}

@Component({
  selector: "app-welcome",
  templateUrl: "./welcome.component.html",
  styleUrls: ["./welcome.component.css"],
})
export class WelcomeComponent implements OnDestroy {
  currentUser$: Observable<CurrentUser | null>;
  dashboardConfig$: Observable<DashboardConfig | null>;

  // Mobile menu
  // class ke andar naya property add karo
  isProfileMenuOpen = false;
  isMenuOpen = false;

  currentYear: number = new Date().getFullYear();

  // Carousel
  currentIndex = 0;
  intervalId: any;
  images: string[] = [
    "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=1000&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1000&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&q=80",
  ];

  // Modal state
  isFormModalOpen = false;

  // Form fields
  branchName = "";
  email = "";
  mobile = "";
  username = "";
  password = "";

  chiefId: any;
  autoEnabled: boolean = true;

  // 👇 role => dashboard config mapping (yaha naye roles add karte rehna)
  private roleDashboardMap: { [key: string]: DashboardConfig } = {
    head: {
      label: "Dashboard",
      route: "/head/dashboard",
    },
    com_part: {
      label: " Dashboard",
      route: "/comPart/commerce-dashboard",
      notifications: 2,
    },
    branch: {
      label: " Dashboard",
      route: "/branch/dashboard",
      notifications: 2,
    },
    chief: {
      label: "Dashboard",
      route: "/chief/dashboard",
      notifications: 2,
    },
    manager: {
      label: "Dashboard",
      route: "/manager/dashboard",
      notifications: 2,
    },
    owner: {
      label: "Dashboard",
      route: "/owner/dashboard",
      notifications: 2,
    },
  };

  constructor(
    private userStateService: UserStateService,
    private chiefAutoService: ChiefManualService,
    private elRef: ElementRef,
  ) {
    this.currentUser$ = this.userStateService.currentUser$;

    this.dashboardConfig$ = this.currentUser$.pipe(
      map((user) => {
        if (!user) return null;

        // agar userStateService me getRole() method hai use direct use karo:
        // const roleName = this.userStateService.getRole()?.toLowerCase();

        // fallback: user.role array se nikal lo (jaisa JSON me aa raha hai)
        const roleName = user?.role?.[0]?.name?.toLowerCase?.();

        if (!roleName) return null;

        return this.roleDashboardMap[roleName] || null;
      }),
    );
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  toggleMobileMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  nextImage() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  prevImage() {
    this.currentIndex =
      (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  goToImage(index: number) {
    this.currentIndex = index;
  }

  // naya method add karo
  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    if (
      this.isProfileMenuOpen &&
      !this.elRef.nativeElement.contains(event.target)
    ) {
      this.isProfileMenuOpen = false;
    }
  }
}
