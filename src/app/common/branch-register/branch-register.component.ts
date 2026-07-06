import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ChiefManualService } from "../../pages/services/chief-manual.service";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";

@Component({
  selector: "app-branch-register",
  templateUrl: "./branch-register.component.html",
  styleUrls: ["./branch-register.component.css"],
})
export class BranchRegisterComponent implements OnInit {
  email = "";
  mobile = "";
  username = "";
  password = "";
  address = "";
  showPassword = false;

  promoCode: any | null = null;
  isEditingPromo: boolean = false;
  submitting: boolean = false;

  constructor(
    private ChiefManualService: ChiefManualService,
    private userStateService: UserStateService,
    private route: ActivatedRoute,
    private snackBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.promoCode = this.route.snapshot.queryParamMap.get("code");
  }

  togglePromoEdit(): void {
    this.isEditingPromo = !this.isEditingPromo;
  }

  onSubmit() {
    if (this.submitting) return;

    const payload = {
      email: this.email,
      phone: this.mobile,
      username: this.username,
      password: this.password,
    };

    this.submitting = true;

    // Jo bhi current promoCode value hai (edited ya original), wahi bhejo
    this.ChiefManualService.performManualAction(
      this.promoCode,
      payload,
    ).subscribe({
      next: (res: any) => {
        this.snackBar.show(
          res.message || "Branch registered successfully",
          true,
        );
        this.onClear();
        this.submitting = false;
      },
      error: (err: any) => {
        this.snackBar.show(err?.error?.message || "Submission failed", false);
        this.submitting = false;
      },
    });
  }

  onClear() {
    this.email = "";
    this.mobile = "";
    this.username = "";
    this.password = "";
  }
}
