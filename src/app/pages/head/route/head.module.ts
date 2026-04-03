// src/app/features/agent/agent.module.ts
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { HeadRoutingModule } from "./head-routing.module";
import { SharedModule } from "../../../core/shared.module";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
 import { HeadDashboardComponent } from "../dashboard/dashboard.component";
 import { AddBranchComponent } from "../branch/add-branch/add-branch.component";
import { AddBranchUserComponent } from "../branch/add-branch-user/add-branch-user.component";
import { ManageBranchComponent } from "../branch/manage-branch/manage-branch.component";
import { ManageBranchUserComponent } from "../branch/manage-branch-user/manage-branch-user.component";
import { HeadUpiComponent } from "../upi/head-upi/head-upi.component";
import { HeadBankComponent } from "../bank/head-bank/head-bank.component";
import { QRCodeComponent } from "angularx-qrcode";
// import {HeadChatComponent} from "../../../trash/head-chat/head-chat.component";
import { HeadNavSidebarComponent } from "../head-navlayout/head-nav-sidebar/head-nav-sidebar.component";
import { HeadNavHeaderComponent } from "../head-navlayout/head-nav-header/head-nav-header.component";
import { HeadNavDashboardLayoutComponent } from "../head-navlayout/head-nav-dashboard-layout/head-nav-dashboard-layout.component";
import { HeadApprovedFundsComponent } from "../head-approved-funds/head-approved-funds.component";
import { HeadRejectedFundsComponent } from "../head-rejected-funds/head-rejected-funds.component";
 import { HeadMobileFooterComponent } from "../head-navlayout/head-mobile-footer/head-mobile-footer.component";
import { PaymentManagementComponent } from "../payment-management/payment-management.component";
import { RecycleManagementComponent } from "../recycle-management/recycle-management.component";
 
@NgModule({
  declarations: [
   AddBranchComponent,
   AddBranchUserComponent,
    HeadDashboardComponent,
   ManageBranchComponent,
   ManageBranchUserComponent,
   HeadUpiComponent,
   HeadBankComponent,
      // HeadChatComponent,
    HeadNavSidebarComponent,
    HeadNavHeaderComponent,
    HeadNavDashboardLayoutComponent,
    HeadApprovedFundsComponent,
    HeadRejectedFundsComponent,
     HeadMobileFooterComponent,
    PaymentManagementComponent,
    RecycleManagementComponent

  ],
  imports: [
    CommonModule,
    SharedModule,
    HeadRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    QRCodeComponent,
],
  exports: [
    SharedModule,
  ],
})
export class HeadModule {}
