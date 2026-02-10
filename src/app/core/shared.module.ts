import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WebhookDataComponent } from "../common/webhook-data/webhook-data.component";
import { NotificateChatComponent } from "../common/notificate-chat/notificate-chat.component";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { WorkTimeComponent } from "../common/work-time/work-time.component";
import { DownlevelLimitsComponent } from "../common/downlevel-limits/downlevel-limits.component";
import { FirstLetterPipe } from "../pipes/first-letter.pipe";
import { PercentageLogComponent } from "../components/reports/percentage-log/percentage-log.component";
import { TransactionHistoryReportComponent } from "../components/reports/transaction-history-report/transaction-history-report.component";
import { EntityReportComponent } from "../components/reports/entity-report/entity-report.component";
import { WorkTimeReportComponent } from "../components/reports/work-time-report/work-time-report.component";
import { FundsReportComponent } from "../components/reports/funds-report/funds-report.component";
import { QRCodeComponent } from "angularx-qrcode";
import { HeadBranchChatComponent } from "../common/branch-chat/head-branch-chat.component";
import { ResizableDirective } from "../directives/resizable.directive";
import { CurrentLimitComponent } from "../components/current-limit/current-limit.component";
import { HeadBranchCapacityComponent } from "../components/head-branch-capacity/head-branch-capacity.component";
import { BalanceHistoryReportComponent } from "../components/reports/balance-history-report/balance-history-report.component";
import { FileSizePipe } from "../pipes/file-size.pipe";
import { HeadChatComponent } from "../common/head-chat/head-chat.component";

@NgModule({
  declarations: [
    WebhookDataComponent,
    NotificateChatComponent,
    WorkTimeComponent,
    HeadBranchChatComponent,
    DownlevelLimitsComponent,
    FirstLetterPipe,
    PercentageLogComponent,
    TransactionHistoryReportComponent,
    EntityReportComponent,
    WorkTimeReportComponent,
    FundsReportComponent,
    ResizableDirective,
    CurrentLimitComponent,
    HeadBranchCapacityComponent,
    BalanceHistoryReportComponent,
    FileSizePipe,
    HeadChatComponent
  ],
  exports: [
    WebhookDataComponent,
    NotificateChatComponent,
    WorkTimeComponent,
    HeadBranchChatComponent,
    DownlevelLimitsComponent,
    FirstLetterPipe,
    PercentageLogComponent,
    TransactionHistoryReportComponent,
    EntityReportComponent,
    WorkTimeReportComponent,
    FundsReportComponent,
    CurrentLimitComponent,
    HeadBranchCapacityComponent,
    BalanceHistoryReportComponent,
    FileSizePipe,
    HeadChatComponent
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, QRCodeComponent],
})
export class SharedModule {}
