import { Component, OnInit } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { BranchService } from "../../../services/branch.service";
import { HeadService } from "../../../services/head.service";
 
 @Component({
  selector: "app-add-branch-user",
  templateUrl: "./add-branch-user.component.html",
  styleUrl: "./add-branch-user.component.css",
})
export class AddBranchUserComponent implements OnInit {
  agentId:any;
  userId: any;
  constructor(
    private snack: SnackbarService,
    private router: ActivatedRoute,
    private HeadService: HeadService,
    private navigationRouter: Router,
     private BranchService: BranchService
  ) {}

  public user = {
    username: "",
    password: "",
    email: "",
    phone: "",
    active: true,
    role: "chief",
    associate: "",
  };

  id: any;
  isLoading = false;
  showPassword = false;

  ngOnInit(): void {
    this.id = this.router.snapshot.paramMap.get("branchId");
    this.agentId = this.router.snapshot.paramMap.get("agentId");
    this.userId = this.router.snapshot.paramMap.get("userId");
    this.user.associate = this.id;
    console.log(this.router.snapshot.paramMap.get("branchId"));
        console.log(this.router.snapshot.paramMap.get("branchId"));

  }

  formSubmit() {
    // Validation
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

    this.isLoading = true;
console.log(this.user);
console.log(this.id);

    this.BranchService.addUserToBranch(this.user, this.id).subscribe(
      (data: any) => {
        this.isLoading = false;
        this.snack.show("Sub-admin created successfully!", "success", 4000);
        // this.clearForm();

        // Optional: Redirect after successful creation
        // setTimeout(() => {
        //   this.navigationRouter.navigate(['/admin/admin-dashboard/manage-agents']);
        // }, 2000);
      },
      (err: any) => {
        this.isLoading = false;
        this.snack.show(
          "Something went wrong while creating sub-admin",
          "error",
          4000
        );
        console.error("Error creating sub-admin:", err);
      }
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
      associate: this.id,
    };
    this.showPassword = false;
  }
}
