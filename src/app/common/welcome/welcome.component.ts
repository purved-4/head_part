// src/app/common/welcome/welcome.component.ts
import { Component, OnInit, OnDestroy } from "@angular/core";
import { UserStateService } from "../../store/user-state.service";
import { Observable } from "rxjs";
import { CurrentUser } from "../../store/current-user-model";

@Component({
  selector: "app-welcome",
  templateUrl: "./welcome.component.html",
  styleUrls: ["./welcome.component.css"],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  currentUser$: Observable<CurrentUser | null>;

  isMenuOpen = false;
  currentIndex = 0;
  intervalId: any;

  images: string[] = [
    "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=1000&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1000&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&q=80",
  ];

  constructor(private userStateService: UserStateService) {
    this.currentUser$ = this.userStateService.getCurrentUser();
  }

  ngOnInit() {
    // If you want slideshow only on browser, you can start interval here.
    // this.intervalId = setInterval(() => this.nextImage(), 6000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  nextImage() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  prevImage() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  goToImage(index: number) {
    this.currentIndex = index;
  }
}
