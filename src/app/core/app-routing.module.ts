import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { LoginComponent } from "../common/login/login.component";
import { BranchAuthGuard } from "./branch.guard";
import { WelcomeComponent } from "../common/welcome/welcome.component";
import { OwnerAuthGuard } from "./owner.guard";
import { ChiefAuthGuard } from "./chief.guard";
import { ManagerAuthGuard } from "./manager.guard";
import { HeadAuthGuard } from "./head.guard";
import { BranchRegisterComponent } from "../common/branch-register/branch-register.component";
import { ComPartAuthGuard } from "./compart.guard";

const routes: Routes = [
  { path: "", component: WelcomeComponent },

  {
    path: "register/:chiefId/:portalId",
    component: BranchRegisterComponent,
  },

  { path: "login", component: LoginComponent },

  // {
  //   path: "owner",
  //   canActivate: [OwnerAuthGuard],
  //   loadChildren: () =>
  //     import("../pages/owner/route/owner.module").then((m) => m.OwnerModule),
  // },
  // {
  //   path: "chief",
  //   canActivate: [ChiefAuthGuard],
  //   loadChildren: () =>
  //     import("../pages/chief/route/chief.module").then((m) => m.ChiefModule),
  // },
  // {
  //   path: "branch",
  //   canActivate: [BranchAuthGuard],
  //   loadChildren: () =>
  //     import("../pages/branch/route/branch.module").then((m) => m.BranchModule),
  // },
  // {
  //   path: "manager",
  //   canActivate: [ManagerAuthGuard],
  //   loadChildren: () =>
  //     import("../pages/manager/route/manager-routing.module").then(
  //       (m) => m.ManagerRoutingModule,
  //     ),
  // },
  {
    path: "head",
    canActivate: [HeadAuthGuard],
    loadChildren: () =>
      import("../pages/head/route/head-routing.module").then(
        (m) => m.HeadRoutingModule,
      ),
  },
  // {
  //   path: "comPart",
  //   canActivate: [ComPartAuthGuard],
  //   loadChildren: () =>
  //     import("../pages/comPart/route/comPart-routing.module").then(
  //       (m) => m.comPartRoutingModule,
  //     ),
  // },
  { path: "**", redirectTo: "/login" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
