import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { BranchService } from "../../../services/branch.service";
import { HeadService } from "../../../services/head.service";

@Component({
  selector: "app-add-branch-user",
  templateUrl: "./add-branch-user.component.html",
  styleUrls: ["./add-branch-user.component.css"],
})
export class AddBranchUserComponent implements OnInit {
  // Inputs for modal usage
  @Input() associate: string | null = null;
  @Input() inModal: boolean = false;

  // Outputs for modal communication
  @Output() created = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  public user = {
    username: "",
    password: "",
    email: "",
    phone: "",
    active: true,
    role: "chief",
    associate: "",
  };

  // From route (when used as standalone page)
  id: string | null = null;
  agentId: string | null = null;
  userId: string | null = null;

  isLoading = false;
  showPassword = false;

  // Validation errors
  emailError: string = "";
  passwordError: string = "";

  constructor(
    private snack: SnackbarService,
    private route: ActivatedRoute,
    private navigationRouter: Router,
    private branchService: BranchService,
    private headService: HeadService,
  ) {}

  ngOnInit(): void {
    // Get route params (for standalone page)
    this.id = this.route.snapshot.paramMap.get("branchId");
    this.agentId = this.route.snapshot.paramMap.get("agentId");
    this.userId = this.route.snapshot.paramMap.get("userId");

    // Use input if provided (modal), otherwise fallback to route param
    this.user.associate = this.associate || this.id || "";
    console.log("User associate:", this.user.associate);
  }

  // Email validation
  validateEmail(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.user.email && !emailRegex.test(this.user.email)) {
      this.emailError = "Please enter a valid email address";
    } else {
      this.emailError = "";
    }
  }

  // Password validation: at least 8 chars, at least one letter, at least one special character
  validatePassword(): void {
    const password = this.user.password;
    if (!password) {
      this.passwordError = "";
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (password.length < 8) {
      this.passwordError = "Password must be at least 8 characters long";
    } else if (!hasLetter) {
      this.passwordError = "Password must contain at least one letter";
    } else if (!hasSpecial) {
      this.passwordError =
        "Password must contain at least one special character";
    } else {
      this.passwordError = "";
    }
  }

  formSubmit() {
    // Trigger validation before submit
    this.validateEmail();
    this.validatePassword();

    // Basic required field checks
    if (this.user.username === "" || this.user.username == null) {
      this.snack.show("Username is required!", "warning", 4000);
      return;
    }

    if (this.user.password === "" || this.user.password == null) {
      this.snack.show("Password is required!", "warning", 4000);
      return;
    }

    if (this.user.email === "" || this.user.email == null) {
      this.snack.show("Email is required!", "warning", 4000);
      return;
    }

    if (this.user.phone === "" || this.user.phone == null) {
      this.snack.show("Phone number is required!", "warning", 4000);
      return;
    }

    // Stop if there are validation errors
    if (this.emailError || this.passwordError) {
      this.snack.show("Please fix validation errors", "warning", 4000);
      return;
    }

    this.isLoading = true;
    console.log(this.user);
    console.log(this.id);

    this.branchService
      .addUserToBranch(this.user, this.user.associate)
      .subscribe(
        (data: any) => {
          this.isLoading = false;
          this.snack.show("User created successfully!", "success", 4000);

          // Emit created event for modal parent
          this.created.emit(data);

          // If in modal, optionally close after a short delay
          if (this.inModal) {
            setTimeout(() => this.close.emit(), 1500);
          } else {
            // For standalone page, maybe clear form or navigate
            // this.clearForm();
          }
        },
        (err: any) => {
          this.isLoading = false;
          this.snack.show(
            "Something went wrong while creating user",
            "error",
            4000,
          );
          console.error("Error creating user:", err);
        },
      );
  }

  onActiveChange(event: any) {
    this.user.active = event.target.checked;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  clearForm() {
    this.user = {
      username: "",
      phone: "",
      email: "",
      password: "",
      active: true,
      role: "chief",
      associate: this.user.associate,
    };
    this.showPassword = false;
    this.emailError = "";
    this.passwordError = "";
  }

  // Called from template cancel button
  onCancel(): void {
    if (this.inModal) {
      this.close.emit();
    } else {
      // Navigate back or clear form
      this.clearForm();
    }
  }

  // Alias for onCancel used in modal close button
  closeModal(): void {
    this.onCancel();
  }
}
