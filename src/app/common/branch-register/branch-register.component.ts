

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
  promoLocked: boolean = false;
  isEditingPromo: boolean = false;
  submitting: boolean = false;

  // --- Edit confirm modal ---
  showEditConfirmModal: boolean = false;

  constructor(
    private ChiefManualService: ChiefManualService,
    private userStateService: UserStateService,
    private route: ActivatedRoute,
    private snackBar: SnackbarService,
  ) {}

  ngOnInit(): void {
  const codeFromUrl = this.route.snapshot.queryParamMap.get("code");
  this.promoCode = codeFromUrl;
  this.promoLocked = !!codeFromUrl;
  }

  // Turning edit ON needs confirmation, turning it OFF (Done) doesn't
  togglePromoEdit(): void {
     if (this.promoLocked) return;
    if (this.isEditingPromo) {
      this.isEditingPromo = false;
      return;
    }
    this.showEditConfirmModal = true;
  }

  confirmEditPromo(): void {
    this.isEditingPromo = true;
    this.showEditConfirmModal = false;
  }

  cancelEditPromo(): void {
    this.showEditConfirmModal = false;
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


