import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { LoginComponent } from "../common/login/login.component";
import { WelcomeComponent } from "../common/welcome/welcome.component";
import { HeadAuthGuard } from "./head.guard";

const routes: Routes = [
  { path: "", component: WelcomeComponent },

  { path: "login", component: LoginComponent },


   {
    path: "head",
    canActivate: [HeadAuthGuard],
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
