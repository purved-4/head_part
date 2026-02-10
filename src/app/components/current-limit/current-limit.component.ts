import { Component, OnInit } from "@angular/core";
import { LimitsService } from "../../pages/services/reports/limits.service";
import { UserStateService } from "../../store/user-state.service";
import { SocketConfigService } from "../../common/socket/socket-config.service";

@Component({
  selector: "app-current-limit",
  templateUrl: "./current-limit.component.html",
  styleUrl: "./current-limit.component.css",
})
export class CurrentLimitComponent implements OnInit {
  constructor(
    private limitService: LimitsService,
    private userStateService: UserStateService,
    private socketService: SocketConfigService
  ) {}

  currentUserRole: any;
  limitRemainingAmount: any;
  currentRoleId: any;

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

    this.limitService
      .getLatestLimitsByEntityAndType(this.currentRoleId, this.currentUserRole)
      .subscribe((res) => {
        this.limitRemainingAmount = res.remainingAmount;
      });
  }
}
