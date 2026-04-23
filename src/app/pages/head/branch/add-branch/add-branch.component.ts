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

interface ComPartItem {
  id: string;
  username: string;
  info?: string;
  active?: boolean;
  transaction?: boolean;
  comPartTypes?: ComPartType[];
  customRate?: boolean;
}

@Component({
  selector: "app-add-branch",
  templateUrl: "./add-branch.component.html",
  styleUrls: ["./add-branch.component.scss"],
})
export class AddBranchComponent implements OnInit {
  branchForm: FormGroup;
  loading = false;

  comparts: ComPartItem[] = [];
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
    this.branchForm = this.fb.group({
      username: ["", Validators.required],
      userEmail: ["", [Validators.required, Validators.email]],
      userPassword: ["", [Validators.required, Validators.minLength(6)]],
      info: [""],
      isActive: [true],
      compartIds: [[], Validators.required],
      customRate: [false],
    });
  }

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();
    this.loadComparts();
  }

  loadComparts(): void {
    this.comPartService
      .getAllComPartByEntity(this.currentUserId, this.role)
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
      const wid = compart.id;

      if (!this.branchForm.contains(`first_payin_${wid}`)) {
        this.branchForm.addControl(
          `first_payin_${wid}`,
          new FormControl("", [
            Validators.required,
            Validators.min(0),
            Validators.max(100),
          ]),
        );
      }

      if (!this.branchForm.contains(`payin_${wid}`)) {
        this.branchForm.addControl(
          `payin_${wid}`,
          new FormControl("", [
            Validators.required,
            Validators.min(0),
            Validators.max(100),
          ]),
        );
      }

      if (!this.branchForm.contains(`payout_${wid}`)) {
        this.branchForm.addControl(
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
    const selectedIds: string[] =
      this.branchForm.get("compartIds")?.value || [];
    return selectedIds.includes(compartId);
  }

  getAvailableComparts(): ComPartItem[] {
    const selectedIds: string[] =
      this.branchForm.get("compartIds")?.value || [];
    const term = this.availableSearchTerm.toLowerCase();

    return this.comparts
      .filter((w) => !selectedIds.includes(w.id))
      .filter((w) => {
        const username = (w.username || "").toLowerCase();
        const info = (w.info || "").toLowerCase();
        return username.includes(term) || info.includes(term);
      });
  }

  getSelectedComparts(): ComPartItem[] {
    const selectedIds: string[] =
      this.branchForm.get("compartIds")?.value || [];
    const term = this.selectedSearchTerm.toLowerCase();

    return this.comparts
      .filter((w) => selectedIds.includes(w.id))
      .filter((w) => {
        const username = (w.username || "").toLowerCase();
        const info = (w.info || "").toLowerCase();
        return username.includes(term) || info.includes(term);
      });
  }

  selectCompart(compartId: string): void {
    const selectedIds: string[] =
      this.branchForm.get("compartIds")?.value || [];
    if (!selectedIds.includes(compartId)) {
      this.branchForm.get("compartIds")?.setValue([...selectedIds, compartId]);
      this.branchForm.get("compartIds")?.markAsTouched();
      this.activeTab = "selected";
    }
  }

  onCompartSelectionChange(event: any, compartId: string): void {
    const selectedIds: string[] =
      this.branchForm.get("compartIds")?.value || [];

    if (event.target.checked) {
      if (!selectedIds.includes(compartId)) {
        this.branchForm
          .get("compartIds")
          ?.setValue([...selectedIds, compartId]);
        this.activeTab = "selected";
      }
    } else {
      this.branchForm
        .get("compartIds")
        ?.setValue(selectedIds.filter((id: string) => id !== compartId));
    }

    this.branchForm.get("compartIds")?.markAsTouched();
  }

  removeCompart(compartId: string): void {
    const selectedIds: string[] =
      this.branchForm.get("compartIds")?.value || [];
    this.branchForm
      .get("compartIds")
      ?.setValue(selectedIds.filter((id: string) => id !== compartId));

    this.branchForm.get("compartIds")?.markAsTouched();
    this.branchForm.get(`first_payin_${compartId}`)?.setValue("");
    this.branchForm.get(`payin_${compartId}`)?.setValue("");
    this.branchForm.get(`payout_${compartId}`)?.setValue("");

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
    const controlName = `${type}_${firstCompart.id}`;
    const value = this.branchForm.get(controlName)?.value;

    selectedComparts.forEach((compart) => {
      const control = this.branchForm.get(`${type}_${compart.id}`);
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

    const compartIds: string[] = this.branchForm.get("compartIds")?.value || [];

    if (compartIds.length === 0) {
      this.snackService.show("Please select at least one compart", false, 3000);
      return;
    }

    if (
      this.branchForm.get("username")?.invalid ||
      this.branchForm.get("userEmail")?.invalid ||
      this.branchForm.get("userPassword")?.invalid
    ) {
      this.snackService.show(
        "Please fill all required fields correctly",
        false,
        3000,
      );
      return;
    }

    for (const compartId of compartIds) {
      const fttCtrl = this.branchForm.get(`first_payin_${compartId}`);
      const payinCtrl = this.branchForm.get(`payin_${compartId}`);
      const payoutCtrl = this.branchForm.get(`payout_${compartId}`);

      fttCtrl?.markAsTouched();
      payinCtrl?.markAsTouched();
      payoutCtrl?.markAsTouched();

      if (
        !this.isValidPercentage(fttCtrl?.value) ||
        !this.isValidPercentage(payinCtrl?.value) ||
        !this.isValidPercentage(payoutCtrl?.value)
      ) {
        this.snackService.show(
          "Please enter valid Payin, Payout & FTT percentages for all selected comparts",
          false,
          4000,
        );
        return;
      }
    }

    const compartPercentages: Record<
      string,
      {
        fttPercentage: number;
        payinPercentage: number;
        payoutPercentage: number;
      }
    > = {};

    compartIds.forEach((id) => {
      compartPercentages[id] = {
        fttPercentage: Number(this.branchForm.get(`first_payin_${id}`)?.value),
        payinPercentage: Number(this.branchForm.get(`payin_${id}`)?.value),
        payoutPercentage: Number(this.branchForm.get(`payout_${id}`)?.value),
      };
    });

    const payload: any = {
      username: this.branchForm.value.username,
      userEmail: this.branchForm.value.userEmail,
      userPassword: this.branchForm.value.userPassword,
      info: this.branchForm.value.info,
      active: this.branchForm.value.isActive,
      customRate: this.branchForm.value.customRate,
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
    this.branchForm.reset({
      username: "",
      userEmail: "",
      userPassword: "",
      info: "",
      isActive: true,
      compartIds: [],
    });

    this.comparts.forEach((compart) => {
      const wid = compart.id;
      this.branchForm.get(`first_payin_${wid}`)?.setValue("");
      this.branchForm.get(`payin_${wid}`)?.setValue("");
      this.branchForm.get(`payout_${wid}`)?.setValue("");
    });

    this.loading = false;
    this.activeTab = "available";
    this.availableSearchTerm = "";
    this.selectedSearchTerm = "";

    this.branchForm.markAsPristine();
    this.branchForm.markAsUntouched();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.branchForm.get(fieldName);
    return !!field && field.invalid && field.touched;
  }

  trackByCompartId(index: number, item: ComPartItem): string {
    return item.id;
  }

  openPercentageModal() {
    // this.selectedWebsiteId = website;

    this.showPercentageModal = true;
  }

  closeModal() {
    this.showPercentageModal = false;
  }

  openCompartPercentModal() {
    // this.selectedWebsiteId = website;

    this.showCompartModal = true;
  }

  closeCompartPercentModal() {
    this.showCompartModal = false;
  }
}
