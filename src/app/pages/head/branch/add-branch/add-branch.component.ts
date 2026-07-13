import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { UserStateService } from "../../../../store/user-state.service";
import { BranchService } from "../../../services/branch.service";

@Component({
  selector: "app-add-branch",
  templateUrl: "./add-branch.component.html",
  styleUrls: ["./add-branch.component.scss"],
})
export class AddBranchComponent implements OnInit {
  chiefForm: FormGroup;
  loading = false;
  showPassword = false;

  currentUserId: string | null = "";
  role: string | null = "";

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackService: SnackbarService,
    private userStateService: UserStateService,
    private branchService: BranchService,
  ) {
    this.chiefForm = this.fb.group({
      username: ["", Validators.required],
      userEmail: ["", [Validators.required, Validators.email]],
      userPassword: ["", [Validators.required, Validators.minLength(6)]],
      info: [""],
      isActive: [true],
      payinPercentage: [
        "",
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      payoutPercentage: [
        "",
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      fttPercentage: [
        "",
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
    });
  }

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private isValidPercentage(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }

  onSubmit(): void {
    if (this.loading) return;

    if (
      this.chiefForm.get("username")?.invalid ||
      this.chiefForm.get("userEmail")?.invalid ||
      this.chiefForm.get("userPassword")?.invalid ||
      this.chiefForm.get("payinPercentage")?.invalid ||
      this.chiefForm.get("payoutPercentage")?.invalid ||
      this.chiefForm.get("fttPercentage")?.invalid
    ) {
      this.chiefForm.markAllAsTouched();
      this.snackService.show(
        "Please fill all required fields correctly",
        false,
        3000,
      );
      return;
    }

    const payinValue = this.chiefForm.get("payinPercentage")?.value;
    const payoutValue = this.chiefForm.get("payoutPercentage")?.value;
    const fttValue = this.chiefForm.get("fttPercentage")?.value;

    if (
      !this.isValidPercentage(payinValue) ||
      !this.isValidPercentage(payoutValue) ||
      !this.isValidPercentage(fttValue)
    ) {
      this.snackService.show(
        "Please enter valid Payin, Payout & FTT percentages",
        false,
        4000,
      );
      return;
    }

    const payload = {
      username: this.chiefForm.value.username,
      userEmail: this.chiefForm.value.userEmail,
      userPassword: this.chiefForm.value.userPassword,
      info: this.chiefForm.value.info,
      active: this.chiefForm.value.isActive,
      balance: 0,
      percentage: {
        payinPercentage: Number(payinValue),
        payoutPercentage: Number(payoutValue),
        fttPercentage: Number(fttValue),
      },
      createdById: this.currentUserId,
      createdByType: this.role,
    };

    this.loading = true;

    this.branchService.addBranch(payload).subscribe({
      next: () => {
        this.loading = false;
        this.snackService.show("Branch created successfully", true, 3000);
        this.clearForm();
      },
      error: (err) => {
        this.loading = false;
        this.snackService.show(
          err?.error?.message || "Failed to create branch",
          false,
          3000,
        );
      },
    });
  }

  clearForm(): void {
    this.chiefForm.reset({
      username: "",
      userEmail: "",
      userPassword: "",
      info: "",
      isActive: true,
      payinPercentage: "",
      payoutPercentage: "",
      fttPercentage: "",
    });

    this.loading = false;
    this.showPassword = false;

    this.chiefForm.markAsPristine();
    this.chiefForm.markAsUntouched();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.chiefForm.get(fieldName);
    return !!field && field.invalid && field.touched;
  }
}
