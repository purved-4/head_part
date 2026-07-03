import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from "@angular/forms";
import { Router } from "@angular/router";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { UserStateService } from "../../../../store/user-state.service";
import { BranchService } from "../../../services/branch.service";
import { ComPartService } from "../../../services/com-part.service";

interface ComPartType {
  comPartType: string;
  enabled: boolean;
}

interface ComPartPercentage {
  compartId: string;
  compartUsername: string;
  info?: string;
  payinPercentage?: any;
  payoutPercentage?: any;
  fttPercentage: any;
}

@Component({
  selector: "app-add-branch",
  templateUrl: "./add-branch.component.html",
  styleUrls: ["./add-branch.component.scss"],
})
export class AddBranchComponent implements OnInit {
  chiefForm: FormGroup;
  loading = false;

  comparts: ComPartPercentage[] = [];
  activeTab: "available" | "selected" = "available";

  currentUserId: string | null = "";
  role: string | null = "";

  availableSearchTerm = "";
  selectedSearchTerm = "";
  showPercentageModal: boolean = false;
  showCompartModal: boolean = false;
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackService: SnackbarService,
    private userStateService: UserStateService,
    private branchService: BranchService,
    private comPartService: ComPartService,
  ) {
    this.chiefForm = this.fb.group({
      username: ["", Validators.required],
      userEmail: ["", [Validators.required, Validators.email]],
      userPassword: ["", [Validators.required, Validators.minLength(6)]],
      info: [""],
      isActive: [true],
      compartIds: [[], Validators.required],
    });
  }

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();
    this.loadComparts();
  }

  loadComparts(): void {
    this.comPartService
      .getPercentageByEntityId(this.currentUserId, this.role)
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.data?.content)
                ? res.data.content
                : Array.isArray(res?.content)
                  ? res.content
                  : [];

          this.comparts = data;
          this.initializeCompartControls();
        },
        error: () => {
          this.snackService.show(
            "Failed to load comparts. Please try again.",
            false,
            3000,
          );
        },
      });
  }

  initializeCompartControls(): void {
    this.comparts.forEach((compart) => {
      const wid = compart.compartId;

      if (!this.chiefForm.contains(`first_payin_${wid}`)) {
        this.chiefForm.addControl(
          `first_payin_${wid}`,
          new FormControl("", [
            Validators.required,
            Validators.min(0),
            Validators.max(100),
          ]),
        );
      }

      if (!this.chiefForm.contains(`payin_${wid}`)) {
        this.chiefForm.addControl(
          `payin_${wid}`,
          new FormControl("", [
            Validators.required,
            Validators.min(0),
            Validators.max(100),
          ]),
        );
      }

      if (!this.chiefForm.contains(`payout_${wid}`)) {
        this.chiefForm.addControl(
          `payout_${wid}`,
          new FormControl("", [
            Validators.required,
            Validators.min(0),
            Validators.max(100),
          ]),
        );
      }
    });
  }

  setActiveTab(tab: "available" | "selected"): void {
    this.activeTab = tab;
  }

  isCompartSelected(compartId: string): boolean {
    const selectedIds: string[] = this.chiefForm.get("compartIds")?.value || [];
    return selectedIds.includes(compartId);
  }

  getAvailableComparts(): ComPartPercentage[] {
    const selectedIds: string[] = this.chiefForm.get("compartIds")?.value || [];
    const term = this.availableSearchTerm.toLowerCase();

    return this.comparts
      .filter((w) => !selectedIds.includes(w.compartId))
      .filter((w) => {
        const username = (w.compartUsername || "").toLowerCase();
        const info = (w.info || "").toLowerCase();
        return username.includes(term) || info.includes(term);
      });
  }

  getSelectedComparts(): ComPartPercentage[] {
    const selectedIds: string[] = this.chiefForm.get("compartIds")?.value || [];
    const term = this.selectedSearchTerm.toLowerCase();

    return this.comparts
      .filter((w) => selectedIds.includes(w.compartId))
      .filter((w) => {
        const username = (w.compartUsername || "").toLowerCase();
        const info = (w.info || "").toLowerCase();
        return username.includes(term) || info.includes(term);
      });
  }

  selectCompart(compartId: string): void {
    const selectedIds: string[] = this.chiefForm.get("compartIds")?.value || [];
    if (!selectedIds.includes(compartId)) {
      this.chiefForm.get("compartIds")?.setValue([...selectedIds, compartId]);
      this.chiefForm.get("compartIds")?.markAsTouched();
      this.activeTab = "selected";
    }
  }

  onCompartSelectionChange(event: any, compartId: string): void {
    const selectedIds: string[] = this.chiefForm.get("compartIds")?.value || [];

    if (event.target.checked) {
      if (!selectedIds.includes(compartId)) {
        this.chiefForm.get("compartIds")?.setValue([...selectedIds, compartId]);
        this.activeTab = "selected";
      }
    } else {
      this.chiefForm
        .get("compartIds")
        ?.setValue(selectedIds.filter((id: string) => id !== compartId));
    }

    this.chiefForm.get("compartIds")?.markAsTouched();
  }

  removeCompart(compartId: string): void {
    const selectedIds: string[] = this.chiefForm.get("compartIds")?.value || [];
    this.chiefForm
      .get("compartIds")
      ?.setValue(selectedIds.filter((id: string) => id !== compartId));

    this.chiefForm.get("compartIds")?.markAsTouched();
    this.chiefForm.get(`first_payin_${compartId}`)?.setValue("");
    this.chiefForm.get(`payin_${compartId}`)?.setValue("");
    this.chiefForm.get(`payout_${compartId}`)?.setValue("");

    if (this.getSelectedComparts().length === 0) {
      this.activeTab = "available";
    }
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();

    if (this.activeTab === "available") {
      this.availableSearchTerm = value;
    } else {
      this.selectedSearchTerm = value;
    }
  }

  applyToAll(type: "payin" | "payout" | "first_payin"): void {
    const selectedComparts = this.getSelectedComparts();
    if (selectedComparts.length === 0) return;

    const firstCompart = selectedComparts[0];
    const controlName = `${type}_${firstCompart.compartId}`;
    const value = this.chiefForm.get(controlName)?.value;

    selectedComparts.forEach((compart) => {
      const control = this.chiefForm.get(`${type}_${compart.compartId}`);
      if (control && value !== null && value !== undefined) {
        control.setValue(value);
        control.markAsTouched();
      }
    });
  }

  private isValidPercentage(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }

  onSubmit(): void {
    if (this.loading) return;

    const compartIds: string[] = this.chiefForm.get("compartIds")?.value || [];

    if (
      this.chiefForm.get("username")?.invalid ||
      this.chiefForm.get("userEmail")?.invalid ||
      this.chiefForm.get("userPassword")?.invalid
    ) {
      this.snackService.show(
        "Please fill all required fields correctly",
        false,
        3000,
      );
      return;
    }

    // Validate only filled percentage fields
    for (const compartId of compartIds) {
      const fttCtrl = this.chiefForm.get(`first_payin_${compartId}`);
      const payinCtrl = this.chiefForm.get(`payin_${compartId}`);
      const payoutCtrl = this.chiefForm.get(`payout_${compartId}`);

      fttCtrl?.markAsTouched();
      payinCtrl?.markAsTouched();
      payoutCtrl?.markAsTouched();

      const fttValue = fttCtrl?.value;
      const payinValue = payinCtrl?.value;
      const payoutValue = payoutCtrl?.value;

      if (
        (fttValue != null &&
          fttValue !== "" &&
          !this.isValidPercentage(fttValue)) ||
        (payinValue != null &&
          payinValue !== "" &&
          !this.isValidPercentage(payinValue)) ||
        (payoutValue != null &&
          payoutValue !== "" &&
          !this.isValidPercentage(payoutValue))
      ) {
        this.snackService.show(
          "Please enter valid Payin, Payout & FTT percentages",
          false,
          4000,
        );
        return;
      }
    }

    const compartPercentages: Record<
      string,
      {
        fttPercentage?: number;
        payinPercentage?: number;
        payoutPercentage?: number;
      }
    > = {};

    compartIds.forEach((id) => {
      const ftt = this.chiefForm.get(`first_payin_${id}`)?.value;
      const payin = this.chiefForm.get(`payin_${id}`)?.value;
      const payout = this.chiefForm.get(`payout_${id}`)?.value;

      const percentage: {
        fttPercentage?: number;
        payinPercentage?: number;
        payoutPercentage?: number;
      } = {};

      if (ftt != null && ftt !== "") {
        percentage.fttPercentage = Number(ftt);
      }

      if (payin != null && payin !== "") {
        percentage.payinPercentage = Number(payin);
      }

      if (payout != null && payout !== "") {
        percentage.payoutPercentage = Number(payout);
      }

      // Add only if at least one value is filled
      if (Object.keys(percentage).length > 0) {
        compartPercentages[id] = percentage;
      }
    });

    const payload = {
      username: this.chiefForm.value.username,
      userEmail: this.chiefForm.value.userEmail,
      userPassword: this.chiefForm.value.userPassword,
      info: this.chiefForm.value.info,
      active: this.chiefForm.value.isActive,
      balance: 0,
      compartPercentages,
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
      compartIds: [],
    });

    this.comparts.forEach((compart) => {
      const wid = compart.compartId;
      this.chiefForm.get(`first_payin_${wid}`)?.setValue("");
      this.chiefForm.get(`payin_${wid}`)?.setValue("");
      this.chiefForm.get(`payout_${wid}`)?.setValue("");
    });

    this.loading = false;
    this.activeTab = "available";
    this.availableSearchTerm = "";
    this.selectedSearchTerm = "";

    this.chiefForm.markAsPristine();
    this.chiefForm.markAsUntouched();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.chiefForm.get(fieldName);
    return !!field && field.invalid && field.touched;
  }

  trackByCompartId(index: number, item: ComPartPercentage): string {
    return item.compartId;
  }

  openPercentageModal() {
    // this.selectedWebsiteId = website;

    this.showPercentageModal = true;
  }

  closeModal() {
    this.showPercentageModal = false;
  }
}
