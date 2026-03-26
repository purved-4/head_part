import { Component, HostListener, OnInit } from "@angular/core";

@Component({
  selector: "app-chat-responsive",
  templateUrl: "./chat-responsive.component.html",
})
export class ChatResponsiveComponent implements OnInit {

  isMobile = false;

  ngOnInit(): void {
    this.checkScreen();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreen();
  }

  checkScreen() {
    // this.isMobile = window.innerWidth < 800;
    this.isMobile =
  typeof matchMedia !== "undefined" &&
  matchMedia("(max-width: 800px)").matches;
  }

}

