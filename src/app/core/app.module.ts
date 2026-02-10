import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";
import { AppRoutingModule } from "./app-routing.module";
import { LoginComponent } from "../common/login/login.component";
import { AppComponent } from "../app.component";
 import { SharedModule } from "./shared.module";
import { AuthInterceptor } from "./auth.interceptor";
import { SnackbarComponent } from "../common/snackbar/snackbar.component";
import { WelcomeComponent } from "../common/welcome/welcome.component";
import { HeadModule } from "../pages/head/route/head.module";

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    SnackbarComponent,
    WelcomeComponent,
    
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule,
    HeadModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
