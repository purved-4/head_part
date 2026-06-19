import { NgModule } from "@angular/core";
import { WebhookDataComponent } from "../common/webhook-data/webhook-data.component";
import { NotificationComponent } from "../common/notification/notification.component";
import { UserProfileComponent } from "../common/user-profile/user-profile.component";
import { WorkTimeComponent } from "../common/work-time/work-time.component";
import { LimitsComponent } from "../common/limits/limits.component";
import { PercentageLogComponent } from "../components/reports/percentage-log/percentage-log.component";
import { TransactionHistoryReportComponent } from "../components/reports/transaction-history-report/transaction-history-report.component";
import { EntityReportComponent } from "../components/reports/entity-report/entity-report.component";
import { WorkTimeReportComponent } from "../components/reports/work-time-report/work-time-report.component";
import { FundsReportComponent } from "../components/reports/funds-report/funds-report.component";
import { UserDashboardUpiBankLimitComponent } from "../components/user-dashboard-upi-bank-limit/user-dashboard-upi-bank-limit.component";
import { CurrentLimitComponent } from "../components/current-limit/current-limit.component";
import { HeadBranchCapacityComponent } from "../components/head-branch-capacity/head-branch-capacity.component";
import { BalanceHistoryReportComponent } from "../components/reports/balance-history-report/balance-history-report.component";
import { BranchRegisterComponent } from "../common/branch-register/branch-register.component";
import { BranchDataHistoryComponent } from "../components/reports/branch-data-history/branch-data-history.component";
import { AddLimitPopupComponent } from "../common/add-limit-popup/add-limit-popup.component";
import { ReloadComponent } from "../common/reload/reload.component";
import { MobileChattingComponent } from "../common/mobile-chatting/mobile-chatting.component";
import { ChatResponsiveComponent } from "../common/chat-responsive/chat-responsive.component";
import { ChatingComponent } from "../common/chating/chating.component";
import { RecycleBankComponent } from "../common/recycle-bank/recycle-bank.component";
import { RecycleUpiComponent } from "../common/recycle-upi/recycle-upi.component";
import { PayinCapacityComponent } from "../common/payin-capacity/payin-capacity.component";
import { WebsitePercentageModelComponent } from "../common/website-percentage-model/website-percentage-model.component";
import { SidebarNotificationComponent } from "../common/sidebar-notification/sidebar-notification.component";
import { TimeZoneComponent } from "../common/time-zone/time-zone.component";
import { CompartPercentageModleComponent } from "../common/compart-percentage-modle/compart-percentage-modle.component";
import { EnityCompartEditModelComponent } from "../common/enity-compart-edit-model/enity-compart-edit-model.component";
import { AutoRefreshComponent } from "../common/auto-refresh/auto-refresh.component";
import { HierarchyManagementComponent } from "../common/hierarchy-management/hierarchy-management.component";
import { AllotCurrencyComponent } from "../common/allot-currency/allot-currency.component";
import { ThemeToggleComponent } from "../theme/theme.component";
import { SearchableDropdownComponent } from "../common/drop-down/drop-down.component";
import { EnterKeyDirective } from "../directives/enter-key.directive";
import { CurrencyAllotmentComponent } from "../common/currency-allotment/currency-allotment.component";
import { BankDetailsComponent } from "../common/head_branch/bank-details/bank-details.component";
import { HbPayoutReportComponent } from "../common/hb-payout-report/hb-payout-report.component";
import { HbPayinReportComponent } from "../common/hb-payin-report/hb-payin-report.component";
import { PendingThreadsComponent } from "../common/pending-threads/pending-threads.component";
import { ChatpopupComponent } from "../common/chatpopup/chatpopup.component";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { SharedModule } from "./shared.module";
import { QRCodeComponent } from "angularx-qrcode";
import { OverrideCurrencyRateComponent } from "../common/head_branch/override-currency-rate/override-currency-rate.component";
import { PaymentsMethodsComponent } from "../common/head_branch/payments-methods/payments-methods.component";
import { SharedUserProfileComponent } from "../common/shared-user-profile/shared-user-profile.component";

@NgModule({
  declarations: [
    WebhookDataComponent,
    NotificationComponent,
    UserProfileComponent,
    WorkTimeComponent,
    LimitsComponent,
    PercentageLogComponent,
    TransactionHistoryReportComponent,
    EntityReportComponent,
    WorkTimeReportComponent,
    FundsReportComponent,
    UserDashboardUpiBankLimitComponent,
    CurrentLimitComponent,
    HeadBranchCapacityComponent,
    BalanceHistoryReportComponent,
    BranchRegisterComponent,
    BranchDataHistoryComponent,
    AddLimitPopupComponent,
    ReloadComponent,
    MobileChattingComponent,
    ChatResponsiveComponent,
    ChatingComponent,
    RecycleBankComponent,
    RecycleUpiComponent,
    PayinCapacityComponent,
    WebsitePercentageModelComponent,
    SidebarNotificationComponent,
    TimeZoneComponent,
    CompartPercentageModleComponent,
    EnityCompartEditModelComponent,
    AutoRefreshComponent,
    HierarchyManagementComponent,
    AllotCurrencyComponent,
    ThemeToggleComponent,
    SearchableDropdownComponent,
    EnterKeyDirective,
    CurrencyAllotmentComponent,
    BankDetailsComponent,
    HbPayoutReportComponent,
    HbPayinReportComponent,
    PendingThreadsComponent,
    ChatpopupComponent,

    OverrideCurrencyRateComponent,
    PaymentsMethodsComponent,
    SharedUserProfileComponent,
  ],
  exports: [
    WebhookDataComponent,
    NotificationComponent,
    UserProfileComponent,
    WorkTimeComponent,
    LimitsComponent,
    PercentageLogComponent,
    TransactionHistoryReportComponent,
    EntityReportComponent,
    WorkTimeReportComponent,
    FundsReportComponent,
    UserDashboardUpiBankLimitComponent,
    CurrentLimitComponent,
    HeadBranchCapacityComponent,
    BalanceHistoryReportComponent,
    BranchRegisterComponent,
    BranchDataHistoryComponent,
    AddLimitPopupComponent,
    ReloadComponent,
    MobileChattingComponent,
    ChatResponsiveComponent,
    ChatingComponent,
    RecycleBankComponent,
    RecycleUpiComponent,
    PayinCapacityComponent,
    WebsitePercentageModelComponent,
    SidebarNotificationComponent,
    TimeZoneComponent,
    CompartPercentageModleComponent,
    EnityCompartEditModelComponent,
    AutoRefreshComponent,
    HierarchyManagementComponent,
    AllotCurrencyComponent,
    ThemeToggleComponent,
    SearchableDropdownComponent,
    EnterKeyDirective,
    CurrencyAllotmentComponent,
    BankDetailsComponent,
    HbPayoutReportComponent,
    HbPayinReportComponent,
    PendingThreadsComponent,
    ChatpopupComponent,

    OverrideCurrencyRateComponent,
    PaymentsMethodsComponent,
    SharedUserProfileComponent,
  ],
  imports: [
    SharedModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    QRCodeComponent,
  ],
})
export class ComponentSharedModule {}
