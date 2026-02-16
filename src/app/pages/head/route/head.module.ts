// src/app/features/agent/agent.module.ts
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { HeadRoutingModule } from "./head-routing.module";
import { SharedModule } from "../../../core/shared.module";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
 import { HeadDashboardComponent } from "../dashboard/dashboard.component";
import { HeadDashboardLayoutComponent } from "../dashboard-layout/dashboard-layout.component";
import { HeadHeaderComponent } from "../header/header.component";
 import { AddBranchComponent } from "../branch/add-branch/add-branch.component";
import { AddBranchUserComponent } from "../branch/add-branch-user/add-branch-user.component";
import { ManageBranchComponent } from "../branch/manage-branch/manage-branch.component";
import { ManageBranchUserComponent } from "../branch/manage-branch-user/manage-branch-user.component";
import { HeadSidebarComponent } from "../head-sidebar/head-sidebar.component";
import { HeadUpiComponent } from "../upi/head-upi/head-upi.component";
import { HeadBankComponent } from "../bank/head-bank/head-bank.component";
import { QRCodeComponent } from "angularx-qrcode";
import {HeadChatComponent} from "../head-chat/head-chat.component";
import { HeadNavSidebarComponent } from "../head-navlayout/head-nav-sidebar/head-nav-sidebar.component";
import { HeadNavHeaderComponent } from "../head-navlayout/head-nav-header/head-nav-header.component";
import { HeadNavDashboardLayoutComponent } from "../head-navlayout/head-nav-dashboard-layout/head-nav-dashboard-layout.component";
  

@NgModule({
  declarations: [
   AddBranchComponent,
   AddBranchUserComponent,
   HeadSidebarComponent,
    HeadDashboardComponent,
   HeadDashboardLayoutComponent,
   HeadHeaderComponent,
   ManageBranchComponent,
   ManageBranchUserComponent,
   HeadUpiComponent,
   HeadBankComponent,
      HeadChatComponent,

    //new 
    HeadNavSidebarComponent,
    HeadNavHeaderComponent,
    HeadNavDashboardLayoutComponent


  ],
  imports: [
    CommonModule,
    SharedModule,
    HeadRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    QRCodeComponent
],
  exports: [
    SharedModule,
  ],
})
export class HeadModule {}
