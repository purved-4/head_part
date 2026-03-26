

import { Component } from '@angular/core';
import { Input } from '@angular/core';
@Component({
  selector: 'app-head-mobile-footer',
  templateUrl: './head-mobile-footer.component.html',
  styleUrl: './head-mobile-footer.component.css'
})
export class HeadMobileFooterComponent {

  @Input() topup = 0;
  @Input() payout = 0;
  @Input() reward = 0;
  @Input() limit = 0;

  isOpen = false;

  toggleSheet() {
    this.isOpen = !this.isOpen;
  }

  format(amount: number): string {
    return Number(amount || 0).toLocaleString('en-IN');
  }
}

