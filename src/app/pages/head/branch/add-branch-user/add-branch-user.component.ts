import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { BranchService } from "../../../services/branch.service";
import { HeadService } from "../../../services/head.service";
import { COUNTRY_CODES } from "../../../../utils/constants";
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
  countryCodes = COUNTRY_CODES;
  selectedCountry = this.countryCodes[0];
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

    // Use input if provided (modal), tpwise fallback to route param
    this.user.associate = this.associate || this.id || "";
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

  // formSubmit() {
  //   // Trigger validation before submit
  //   this.validateEmail();
  //   this.validatePassword();

  //   // Basic required field checks
  //   if (this.user.username === "" || this.user.username == null) {
  //     this.snack.show("Username is required!", false, 4000);
  //     return;
  //   }

  //   if (this.user.password === "" || this.user.password == null) {
  //     this.snack.show("Password is required!", false, 4000);
  //     return;
  //   }

  //   if (this.user.email === "" || this.user.email == null) {
  //     this.snack.show("Email is required!", false, 4000);
  //     return;
  //   }

  //   if (this.user.phone === "" || this.user.phone == null) {
  //     this.snack.show("Phone number is required!", false, 4000);
  //     return;
  //   }

  //   // Stop if there are validation errors
  //   if (this.emailError || this.passwordError) {
  //     this.snack.show("Please fix validation errors", false, 4000);
  //     return;
  //   }

  //   this.isLoading = true;

  //   this.branchService
  //     .addUserToBranch(this.user, this.user.associate)
  //     .subscribe(
  //       (data: any) => {
  //         this.isLoading = false;
  //         this.snack.show("User created successfully!", true, 4000);

  //         // Emit created event for modal parent
  //         this.created.emit(data);

  //         // If in modal, optionally close after a short delay
  //         if (this.inModal) {
  //           setTimeout(() => this.close.emit(), 1500);
  //         } else {
  //           // For standalone page, maybe clear form or navigate
  //           // this.clearForm();
  //         }
  //       },
  //       (err: any) => {
  //         this.isLoading = false;
  //         this.snack.show(
  //           "Something went wrong while creating user",
  //           false,
  //           4000,
  //         );
  //
  //       },
  //     );
  // }

  formSubmit() {
    // Trigger validation
    this.validateEmail();
    this.validatePassword();

    // Required field checks
    if (!this.user.username) {
      this.snack.show("Username is required!", false, 4000);
      return;
    }

    if (!this.user.password) {
      this.snack.show("Password is required!", false, 4000);
      return;
    }

    if (!this.user.email) {
      this.snack.show("Email is required!", false, 4000);
      return;
    }

    if (!this.user.phone) {
      this.snack.show("Phone number is required!", false, 4000);
      return;
    }

    // Stop if validation errors exist
    if (this.emailError || this.passwordError) {
      this.snack.show("Please fix validation errors", false, 4000);
      return;
    }

    // Combine country dial code with phone
    const fullPhone = `${this.selectedCountry.dialCode}${this.user.phone}`;

    // Prepare payload
    const payload = {
      ...this.user,
      phone: fullPhone,
    };

    this.isLoading = true;

    this.branchService.addUserToBranch(payload, this.user.associate).subscribe({
      next: (data: any) => {
        this.isLoading = false;
        this.snack.show("User created successfully!", true, 4000);

        // Emit event to parent
        this.created.emit(data);

        if (this.inModal) {
          setTimeout(() => this.close.emit(), 1500);
        }
      },
      error: (err: any) => {
        this.isLoading = false;

        this.snack.show(
          err?.error?.message || "Something went wrong while creating user",
          false,
          4000,
        );
      },
    });
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
