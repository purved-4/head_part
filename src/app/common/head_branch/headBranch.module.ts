import { NgModule } from "@angular/core";
import { InventoryConfigurationComponent } from "./inventory-configuration/inventory-configuration.component";
import { AddBankComponent } from "./add-bank/add-bank.component";
import { AddUpiComponent } from "./add-upi/add-upi.component";
import { UpisComponent } from "./upis/upis.component";
import { BanksComponent } from "./banks/banks.component";
import { HeadBranchDashboardComponent } from "./head-branch-dashboard/head-branch-dashboard.component";
import { OverrideCurrencyRateComponent } from "./override-currency-rate/override-currency-rate.component";
import { PaymentsMethodsComponent } from "./payments-methods/payments-methods.component";
import { CommonModule } from "@angular/common";
import { SharedModule } from "../../core/shared.module";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { QRCodeComponent } from "angularx-qrcode";
import { ComponentSharedModule } from "../../core/components.share.module"; // ✅ added

@NgModule({
  declarations: [
    InventoryConfigurationComponent,
    AddBankComponent,
    AddUpiComponent,
    UpisComponent,
    BanksComponent,
    HeadBranchDashboardComponent,
  ],
  exports: [
    InventoryConfigurationComponent,
    AddBankComponent,
    AddUpiComponent,
    UpisComponent,
    BanksComponent,
    HeadBranchDashboardComponent,
  ],
  imports: [
    SharedModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    QRCodeComponent,
    ComponentSharedModule,
  ],
})
export class HeadBranchModule {}
