import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../pages/services/auth.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { UserStateService } from "../../store/user-state.service";
import { SocketConfigService } from "../../pages/services/socket/socket-config.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit{
  loginData = {
    email: "",
    password: "",
  };

  showPassword = false;

  constructor(
    private login: AuthService,
    private router: Router,
    private http: HttpClient,
    private snackbarService: SnackbarService,
    private userStateService: UserStateService,
    private socketConfigService: SocketConfigService
  ) {}

 ngOnInit(): void {
  this.socketConfigService.destroyAll()
  // this.login.getCurrentUser().subscribe({
  //   next: (user: any) => {
  //     if (user && user.role?.length) {
  //       const role = user.role[0].name.toLowerCase();

  //       document.documentElement.setAttribute("data-role", role);

  //       // this.navigateToRoleHome(role);
  //     } else {
  //       // No valid user → destroy sockets
  //       this.socketConfigService.destroyAll();
  //     }
  //   },
  //   error: (err) => {
  //     // API failed / not logged in → destroy sockets
  //     this.socketConfigService.destroyAll();
  //   }
  // });
}

  formSubmit() {
    if (!this.loginData.email || this.loginData.email.trim() === "") {
      this.snackbarService.show("Email is required !!", false, 4000);
      return;
    }

    if (!this.loginData.password || this.loginData.password.trim() === "") {
      this.snackbarService.show("Password is required !!", false, 4000);
      return;
    }

    this.login.generateToken(this.loginData).subscribe({
      next: (res: any) => {
        // success true
        if (res?.success) {
          this.snackbarService.show(res.message, true, 4000);

          this.login.getCurrentUser().subscribe((user: any) => {
            const role = user.role[0].name.toLowerCase();

            document.documentElement.setAttribute("data-role", role);

          this.navigateToRoleHome(role)
          });
        }
        // success false but status 200
        else {
          const msg = res?.message || res?.error || "Login failed";
          this.snackbarService.show(msg, false, 5000);
        }
      },

      error: (err) => {
        console.log("FULL ERROR:", err);

        const msg =
          err?.error?.message ||
          err?.error?.error ||
          err?.message ||
          "Server error";

        this.snackbarService.show(msg, false, 5000);
      },
    });
  }

  clearForm() {
    this.loginData = {
      email: "",
      password: "",
    };
    this.snackbarService.show("Form cleared", "success", 4000);
  }

   private navigateToRoleHome(role: any): void {
    const r = (role ?? "").toUpperCase();

    switch (r) {
      case "OWNER":
        this.router.navigate(["/owner"]);
        break;
      case "CHIEF":
        this.router.navigate(["/chief"]);
        break;
      case "BRANCH":
        this.router.navigate(["/branch"]);
        break;
      case "HEAD":
        this.router.navigate(["/head"]);
        break;
      case "MANAGER":
        this.router.navigate(["/manager"]);
        break;
      case "COM_PART":
        this.router.navigate(["/comPart"]);
        break;
      default:
        this.router.navigate(["/"]);
    }
  }
}
