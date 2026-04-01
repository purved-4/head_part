import { Component, OnInit, OnDestroy } from "@angular/core";
import { UserStateService } from "../../store/user-state.service";
import { ChiefManualService } from "../../pages/services/chief-manual.service";
import { Observable } from "rxjs";
import { CurrentUser } from "../../store/current-user-model";

@Component({
  selector: "app-welcome",
  templateUrl: "./welcome.component.html",
  styleUrls: ["./welcome.component.css"],
})
export class WelcomeComponent implements OnDestroy {
  currentUser$: Observable<CurrentUser | null>;

  // Mobile menu
  isMenuOpen = false;

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

  constructor(
    private userStateService: UserStateService,
    private chiefAutoService: ChiefManualService,
  ) {
    this.currentUser$ = this.userStateService.currentUser$;
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  // Mobile menu toggle
  toggleMobileMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  // Carousel navigation
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
}