import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WebhookDataComponent } from "../common/webhook-data/webhook-data.component";
import { NotificationComponent } from "../common/notification/notification.component";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { UserProfileComponent } from "../common/user-profile/user-profile.component";
import { WorkTimeComponent } from "../common/work-time/work-time.component";
import { LimitsComponent } from "../common/limits/limits.component";
import { FirstLetterPipe } from "../pipes/first-letter.pipe";
import { PercentageLogComponent } from "../components/reports/percentage-log/percentage-log.component";
import { TransactionHistoryReportComponent } from "../components/reports/transaction-history-report/transaction-history-report.component";
import { EntityReportComponent } from "../components/reports/entity-report/entity-report.component";
import { WorkTimeReportComponent } from "../components/reports/work-time-report/work-time-report.component";
import { FundsReportComponent } from "../components/reports/funds-report/funds-report.component";
import { QRCodeComponent } from "angularx-qrcode";
import { ResizableDirective } from "../directives/resizable.directive";
import { UserDashboardUpiBankLimitComponent } from "../components/user-dashboard-upi-bank-limit/user-dashboard-upi-bank-limit.component";
import { CurrentLimitComponent } from "../components/current-limit/current-limit.component";
import { HeadBranchCapacityComponent } from "../components/head-branch-capacity/head-branch-capacity.component";
import { BalanceHistoryReportComponent } from "../components/reports/balance-history-report/balance-history-report.component";
import { FileSizePipe } from "../pipes/file-size.pipe";
import { BranchRegisterComponent } from "../common/branch-register/branch-register.component";
import { BranchDataHistoryComponent } from "../components/reports/branch-data-history/branch-data-history.component";
import { AddLimitPopupComponent } from "../common/add-limit-popup/add-limit-popup.component";
import { ReloadComponent } from "../common/reload/reload.component";
import { MobileChattingComponent } from "../common/mobile-chatting/mobile-chatting.component";
import { ChatResponsiveComponent } from "../common/chat-responsive/chat-responsive.component";
import { ChatingComponent } from "../common/chating/chating.component";
 import { RecycleUpiComponent } from "../common/recycle-upi/recycle-upi.component";
import { RecycleBankComponent } from "../common/recycle-bank/recycle-bank.component";
import { TopupCapacityComponent } from "../common/topup-capacity/topup-capacity.component";
// import { AcceptRejectChatComponent } from "../pages/comPart/accept-reject-chat/accept-reject-chat.component";
import { PlaceholderPipe } from "../pipes/placeholder.pipe";
import { PortalPercentagePopupComponent } from "../common/website-percentage-model/website-percentage-model.component";

// shared.module.ts
@NgModule({
  declarations: [
    WebhookDataComponent,
    NotificationComponent,
    UserProfileComponent,
    WorkTimeComponent,
    LimitsComponent,
    FirstLetterPipe,
    PercentageLogComponent,
    TransactionHistoryReportComponent,
    EntityReportComponent,
    WorkTimeReportComponent,
    FundsReportComponent,
    ResizableDirective,
    UserDashboardUpiBankLimitComponent,
    CurrentLimitComponent,
    HeadBranchCapacityComponent,
    BalanceHistoryReportComponent,
    FileSizePipe,
    BranchRegisterComponent,
    BranchDataHistoryComponent,
    AddLimitPopupComponent,
    ReloadComponent,
    MobileChattingComponent,
    ChatResponsiveComponent,
    ChatingComponent,
    RecycleBankComponent,
    RecycleUpiComponent,
    TopupCapacityComponent,
    PlaceholderPipe,
    PortalPercentagePopupComponent
    
    
  ],
  exports: [
    WebhookDataComponent,
    NotificationComponent,
    UserProfileComponent,
    WorkTimeComponent,
    
    LimitsComponent,
    FirstLetterPipe,
    PercentageLogComponent,
    TransactionHistoryReportComponent,
    EntityReportComponent,
    WorkTimeReportComponent,
    FundsReportComponent,
    UserDashboardUpiBankLimitComponent,
    CurrentLimitComponent,
    HeadBranchCapacityComponent,
    BalanceHistoryReportComponent,
    FileSizePipe,
    BranchDataHistoryComponent,
    ReloadComponent,
    AddLimitPopupComponent,
    MobileChattingComponent,
    ChatResponsiveComponent,
    ChatingComponent,
    RecycleBankComponent,
    RecycleUpiComponent,
    TopupCapacityComponent,
    PlaceholderPipe,
    PortalPercentagePopupComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, QRCodeComponent],
})
export class SharedModule {}
