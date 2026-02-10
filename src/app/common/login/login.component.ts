import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../pages/services/auth.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { UserStateService } from "../../store/user-state.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent {
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
  ) {}

  formSubmit() {
    if (this.loginData.email.trim() === "" || this.loginData.email === null) {
      this.snackbarService.show("Email is required !!", false, 4000);
      return;
    }

    if (
      this.loginData.password.trim() === "" ||
      this.loginData.password === null
    ) {
      this.snackbarService.show("Password is required !!", false, 4000);
      return;
    }

    this.login.generateToken(this.loginData).subscribe({
      next: (res: any) => {
        var role = "NULL";
        if (res.success) {
          this.snackbarService.show(res.message, res.success, 4000);
          this.login.getCurrentUser().subscribe((user: any) => {
            role = user.role[0].name.toLowerCase();
            console.log("User role:", role);
            document.documentElement.setAttribute(
              "data-role",
              role?.toLocaleLowerCase(),
            );

            switch (role) {
              case "head":
                this.router.navigate(["head"]);
                break;
              default:
            }
          });
        }
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
}
