import { NgModule } from "@angular/core";
import { InventoryConfigurationComponent } from "./inventory-configuration/inventory-configuration.component";
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
import { HbPayinReportComponent } from "./hb-payin-report/hb-payin-report.component";
import { HbPayoutReportComponent } from "./hb-payout-report/hb-payout-report.component";
import { AddBankComponent } from "./add-payment-methods/add-bank/add-bank.component";
import { AddUpiComponent } from "./add-payment-methods/add-upi/add-upi.component";
import { AddBep20Component } from "./add-bep20/add-bep20.component";
import { AddErc20Component } from "./add-erc20/add-erc20.component";
import { AddOmniComponent } from "./add-omni/add-omni.component";
import { AddSplComponent } from "./add-spl/add-spl.component";
import { AddTrc20Component } from "./add-trc20/add-trc20.component";
import { CryptoManagementComponent } from "./crypto-management/crypto-management.component";
import { RecycleCryptoComponent } from "./recycle-crypto/recycle-crypto.component";
import { RecycleManagementComponent } from "./recycle-management/recycle-management.component";

@NgModule({
  declarations: [
    InventoryConfigurationComponent,
    AddBankComponent,
    AddUpiComponent,
    UpisComponent,
    BanksComponent,
    HeadBranchDashboardComponent,
    HbPayinReportComponent,
    HbPayoutReportComponent,
    AddBep20Component,
    AddErc20Component,
    AddOmniComponent,
    AddSplComponent,
    AddTrc20Component,
    CryptoManagementComponent,
    RecycleCryptoComponent,RecycleManagementComponent
  ],
  exports: [
    InventoryConfigurationComponent,
    AddBankComponent,
    AddUpiComponent,
    UpisComponent,
    BanksComponent,
    HeadBranchDashboardComponent,
    HbPayinReportComponent,
    HbPayoutReportComponent,
    AddBep20Component,
    AddErc20Component,
    AddOmniComponent,
    AddSplComponent,
    AddTrc20Component,
    CryptoManagementComponent,
    RecycleCryptoComponent,
    RecycleManagementComponent
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
