import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { LoginComponent } from "../common/login/login.component";
import { RoleAuthGuard } from "./role-auth.guard";
import { LoginRedirectGuard } from "./login-redirect.guard";
import { BranchRegisterComponent } from "../common/branch-register/branch-register.component";
import { WelcomeComponent } from "../common/welcome/welcome.component";

const routes: Routes = [
  { path: "", component: LoginComponent, canActivate: [LoginRedirectGuard] },
  {
    path: "login",
    component: LoginComponent,
    canActivate: [LoginRedirectGuard],
  },

  { path: "register/code", component: BranchRegisterComponent },
  { path: "register/affiliateLink", component: BranchRegisterComponent },
  // { path: "open", component: AnonymousTransactionComponent },

  {
    path: "head",
    canActivate: [RoleAuthGuard],
    data: { roles: ["head"] },
    loadChildren: () =>
      import("../pages/head/route/head-routing.module").then(
        (m) => m.HeadRoutingModule,
      ),
  },

  { path: "**", redirectTo: "/login" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
