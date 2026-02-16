import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AddBranchComponent } from "../branch/add-branch/add-branch.component";
import { HeadDashboardComponent } from "../dashboard/dashboard.component";
import { HeadDashboardLayoutComponent } from "../dashboard-layout/dashboard-layout.component";
import { ManageBranchComponent } from "../branch/manage-branch/manage-branch.component";

import { DownlevelLimitsComponent } from "../../../common/downlevel-limits/downlevel-limits.component";
import { WorkTimeReportComponent } from "../../../components/reports/work-time-report/work-time-report.component";
import { PercentageLogComponent } from "../../../components/reports/percentage-log/percentage-log.component";
import { FundsReportComponent } from "../../../components/reports/funds-report/funds-report.component";
import { EntityReportComponent } from "../../../components/reports/entity-report/entity-report.component";
import { TransactionHistoryReportComponent } from "../../../components/reports/transaction-history-report/transaction-history-report.component";
import { AddBranchUserComponent } from "../branch/add-branch-user/add-branch-user.component";
import { ManageBranchUserComponent } from "../branch/manage-branch-user/manage-branch-user.component";
// import { HeadBranchChatComponent } from "../../../common/head-branch-chat/head-branch-chat.component";
import { HeadUpiComponent } from "../upi/head-upi/head-upi.component";
import { HeadBankComponent } from "../bank/head-bank/head-bank.component";
import { HeadChatComponent } from "../head-chat/head-chat.component";
// import { ApprovedFundsComponent } from "../../branch/approved-funds/approved-funds.component";
// import { RejectedFundsComponent } from "../../branch/rejected-funds/rejected-funds.component";
import { HeadBranchCapacityComponent } from "../../../components/head-branch-capacity/head-branch-capacity.component";

import { HeadBranchChatComponent } from "../../../common/branch-chat/head-branch-chat.component";
import { HeadNavDashboardLayoutComponent } from "../head-navlayout/head-nav-dashboard-layout/head-nav-dashboard-layout.component";

const routes: Routes = [
  {
    path: "",
    component: HeadNavDashboardLayoutComponent,
    children: [
      {
        path: "",
        component: HeadDashboardComponent,
      },

      {
        path: "upi",
        component: HeadUpiComponent,
      },
      {
        path: "bank",
        component: HeadBankComponent,
      },

      {
        path: "branch",
        children: [
          { path: "add", component: AddBranchComponent },
          {
            path: "manage",
            component: ManageBranchComponent,
          },
        ],
      },
      {
        path: "branch-user",
        children: [
          {
            path: "add/:branchId",
            component: AddBranchUserComponent,
          },
          {
            path: "manage/:branchId",
            component: ManageBranchUserComponent,
          },
        ],
      },
      { path: "branch-chat", component: HeadBranchChatComponent },
      { path: "head-chat", component: HeadChatComponent },
      {
        path: "limit",
        component: DownlevelLimitsComponent,
      },

      {
        path: "reports",
        children: [
          {
            path: "transaction-history",
            component: TransactionHistoryReportComponent,
          },
          { path: "entity-report", component: EntityReportComponent },
          { path: "funds-report", component: FundsReportComponent },
          {
            path: "amount-percentage",
            component: PercentageLogComponent,
          },
          { path: "work-time", component: WorkTimeReportComponent },
          // { path: "funds/accepted", component: ApprovedFundsComponent },
          // { path: "funds/rejected", component: RejectedFundsComponent },
        ],
      },
      { path: "capacity", component: HeadBranchCapacityComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HeadRoutingModule {}
