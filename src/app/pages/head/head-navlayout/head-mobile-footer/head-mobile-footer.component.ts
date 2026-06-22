import { Component } from "@angular/core";
import { Input } from "@angular/core";
import { ThemeService } from "../../../../theme/theme.service";
import { Router } from "@angular/router";
@Component({
  selector: "app-head-mobile-footer",
  templateUrl: "./head-mobile-footer.component.html",
  styleUrl: "./head-mobile-footer.component.css",
})
export class HeadMobileFooterComponent {
  @Input() payin = 0;
  @Input() payout = 0;
  @Input() reward = 0;
  @Input() limit = 0;
  @Input() exploser = 0;

  isOpen = false;

  

  goToChats(){
    this.router.navigate(['/head/chat']);
    this.isOpen = false;
  }


openPendingThreads() {
  this.showPendingThreads = true;
}

    showPendingThreads = false;
    chatPanelOpen = false;
      entityId: any;
    entityType: any;

    closePendingThreads(): void {
    this.showPendingThreads = false;
  }

  onChatPanelStateChange(isOpen: boolean): void {
    this.chatPanelOpen = isOpen;
  }

  constructor(
    public theme: ThemeService,
    private router: Router
  ) {}

  toggleSheet() {
    this.isOpen = !this.isOpen;
  }

  format(amount: number): string {
    return Number(amount || 0).toLocaleString("en-IN");
  }
}
