import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { LimitsService } from "../../../services/reports/limits.service";
import { UserStateService } from "../../../../store/user-state.service";
import { SocketConfigService } from "../../../../common/socket/socket-config.service";
import { FundsService } from "../../../services/funds.service";
@Component({
  selector: 'app-head-nav-header',
  templateUrl: './head-nav-header.component.html',
  styleUrls: ['./head-nav-header.component.css']
})
export class HeadNavHeaderComponent implements OnInit {
  @Input() pageTitle: string = "Dashboard";
  @Input() userName: string = "Branch User";
  @Input() notifications: number = 3;
@Input() marginLeft: number = 0;

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
  @Output() search = new EventEmitter<string>();

  dummyStats = {
    currentLimit: "₹50,000",
    workTime: "08:45",
    upiLimit: "₹25,000",
    bankLimit: "₹1,00,000",
    payout: "₹1,20,000",
    topup: "₹50,000",
    reward: "500 pts",
  };

  searchTerm: string = "";

  currentUserRole: any;
  limitRemainingAmount: any = 0;
  currentRoleId: any;
  payoutBalance: any = 0;
  topupBalance: any = 0;
  rewards: any;
  bankBalance: any = 0;
  upiBalance: any = 0;

  constructor(
    private limitService: LimitsService,
    private userStateService: UserStateService,
    private socketService: SocketConfigService,
    private fundService: FundsService,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.currentUserRole = this.userStateService.getRole();

    this.socketService.subscribeLatestBalance(this.currentRoleId);

    this.socketService.getLatestBalance().subscribe((res) => {
      console.log(res);

      if (res?.data?.remainingAmount !== undefined) {
        this.limitRemainingAmount = res.data.remainingAmount;
      }
    });

    this.fundService
      .broadcast(this.currentRoleId, this.currentUserRole)
      .subscribe((res) => {
        this.payoutBalance = res.ACCEPTED_CURRENCY_PAYOUT;
        this.upiBalance = res.ACCEPTED_CURRENCY_UPI;
        this.bankBalance = res.ACCEPTED_CURRENCY_BANK;
        this.rewards = res.Branch_Balance;
        this.topupBalance = this.upiBalance + this.bankBalance;
      });

    this.limitService
      .getLatestLimitsByEntityAndType(this.currentRoleId, this.currentUserRole)
      .subscribe((res) => {
        this.limitRemainingAmount = res.remainingAmount;
      });
  }

  onToggleClick() {
    this.toggleSidebar.emit();
  }

  onOpenSettings() {
    this.openSettings.emit();
  }

  onSearchInput(ev: Event) {
    this.searchTerm = (ev.target as HTMLInputElement).value;
    this.search.emit(this.searchTerm);
  }

  getUserInitials(): string {
    if (!this.userName) return "BU";
    return this.userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

 formatIndianAmount(amount: number | string): string {
  if (amount === null || amount === undefined) return "0";

  const value = Number(amount);
  if (isNaN(value)) return "0";

  const truncate = (num: number, decimals: number) => {
    const factor = Math.pow(10, decimals);
    return Math.floor(num * factor) / factor;
  };

  if (value >= 10000000) {
    // Crores
    const cr = truncate(value / 10000000, 2);
    return cr % 1 === 0 ? `${cr}Cr` : `${cr}Cr`;
  }

  if (value >= 100000) {
    // Lakhs
    const l = truncate(value / 100000, 2);
    return l % 1 === 0 ? `${l}L` : `${l}L`;
  }

  if (value >= 1000) {
    // Thousands
    const k = truncate(value / 1000, 2);
    return k % 1 === 0 ? `${k}K` : `${k}K`;
  }

  return value.toString();
}

formatFullAmount(amount: number | string): string {
  if (amount === null || amount === undefined) return "₹0";
  return "₹" + Number(amount).toLocaleString("en-IN");
}


}
