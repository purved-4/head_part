// bank-details.component.ts

import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-bank-details",
  templateUrl: "./bank-details.component.html",
  styleUrl: "./bank-details.component.css",
})
export class BankDetailsComponent {
  @Input() bankData: any;

  @Output() close = new EventEmitter<void>();

  closeModal(): void {
    this.close.emit();
  }

  copyAccountNumber(): void {
    if (this.bankData?.accountNo) {
      navigator.clipboard.writeText(this.bankData.accountNo);
    }
  }

  formatDate(date: any): string {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getMaskedAccount(account: string): string {
    if (!account) return "-";

    const last4 = account.slice(-4);
    return `XXXXXX${last4}`;
  }
}
