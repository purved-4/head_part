import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
  provideHttpClient,
  withFetch,
} from "@angular/common/http";
import { AppRoutingModule } from "./app-routing.module";
import { LoginComponent } from "../common/login/login.component";
import { AppComponent } from "../app.component";
import { SharedModule } from "./shared.module";

import { AuthInterceptor } from "./auth.interceptor";

import { HeadModule } from "../pages/head/route/head.module";
import { SnackbarComponent } from "../common/snackbar/snackbar.component";
import { WelcomeComponent } from "../common/welcome/welcome.component";

import { AuthCacheInterceptor } from "./cache.interceptor";
import { LoaderInterceptor } from "./loader.interceptor";
import { ComponentSharedModule } from "./components.share.module";
import { HeadBranchModule } from "../common/head_branch/headBranch.module";
import { HeaderComponent } from "../common/header/header.component";

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    SnackbarComponent,
    WelcomeComponent,
    HeaderComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,

    SharedModule,

    HeadModule,

    ComponentSharedModule,
    HeadBranchModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    // provideHttpClient(withFetch()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoaderInterceptor, // 👈 Capital L — class hai, function nahi
      multi: true,
    },
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
