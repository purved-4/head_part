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
import { HeadService } from "../../../services/head.service";

@Component({
  selector: "app-add-branch",
  templateUrl: "./add-branch.component.html",
  styleUrls: ["./add-branch.component.scss"],
})
export class AddBranchComponent implements OnInit {
  chiefForm: FormGroup;
  loading = false;
  websites: any[] = [];
  activeTab: "available" | "selected" = "available";
  currentUserId: string | null = "";
  role: string | null = "";

  // Search properties
  websiteSearchTerm: string = "";
  filteredWebsites: any[] = [];
  showDropdown = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackService: SnackbarService,
    private userStateService: UserStateService,
    private branchService: BranchService,
    private headService: HeadService,
  ) {
    this.chiefForm = this.fb.group({
      name: ["", Validators.required],
      mobile: ["", [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ["", [Validators.required, Validators.email]],
      info: [""],
      isActive: [true],
      websiteIds: [[], Validators.required],
    });
  }

  ngOnInit() {
    this.currentUserId = this.userStateService.getCurrentRoleId();
    this.role = this.userStateService.getRole();
    this.loadWebsites();
  }

  loadWebsites() {
    this.headService.getAllHeadsWithWebsitesById(this.currentUserId).subscribe({
      next: (res: any) => {
        this.websites = res;
        console.log(this.websites);
        this.initializeWebsiteControls();
        this.filterWebsites(); // initial filter (empty)
      },
      error: (err) => {
        console.error("Error loading websites:", err);
        this.snackService.show(
          "Failed to load websites. Please try again.",
          false,
          3000,
        );
      },
    });
  }

  initializeWebsiteControls() {
    this.websites.forEach((website) => {
      const wid = website.websiteId || website.id;
      if (!this.chiefForm.contains(`topup_${wid}`)) {
        this.chiefForm.addControl(
          `topup_${wid}`,
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

  setActiveTab(tab: "available" | "selected") {
    this.activeTab = tab;
  }

  isWebsiteSelected(websiteId: string): boolean {
    const selectedIds: string[] = this.chiefForm.get("websiteIds")?.value || [];
    return selectedIds.includes(websiteId);
  }

  getAvailableWebsites(): any[] {
    const selectedIds: string[] = this.chiefForm.get("websiteIds")?.value || [];
    return this.websites.filter(
      (website) => !selectedIds.includes(website.websiteId || website.id),
    );
  }

  getSelectedWebsites(): any[] {
    const selectedIds: string[] = this.chiefForm.get("websiteIds")?.value || [];
    return this.websites.filter((website) =>
      selectedIds.includes(website.websiteId || website.id),
    );
  }

  // Getter for selected count
  get selectedWebsiteCount(): number {
    return (this.chiefForm.get("websiteIds")?.value || []).length;
  }

  // Search filter method – updates filteredWebsites based on available websites
  filterWebsites(): void {
    const term = this.websiteSearchTerm.trim().toLowerCase();
    const available = this.getAvailableWebsites();
    if (!term) {
      this.filteredWebsites = available; // show all available when search empty
    } else {
      this.filteredWebsites = available.filter(
        (w) =>
          (w.websiteDomain || w.domain || w.name || "")
            .toLowerCase()
            .includes(term) ||
          (w.websiteId || w.id || "").toLowerCase().includes(term),
      );
    }
  }

  hideDropdown(): void {
    setTimeout(() => (this.showDropdown = false), 200);
  }

  // Called when a website is clicked in the dropdown
  selectWebsite(website: any): void {
    const websiteId = website.websiteId || website.id;
    const selectedIds: string[] = this.chiefForm.get("websiteIds")?.value || [];
    if (!selectedIds.includes(websiteId)) {
      this.chiefForm.get("websiteIds")?.setValue([...selectedIds, websiteId]);
      this.chiefForm.get("websiteIds")?.markAsTouched();
      // Optionally switch to Selected tab
      this.activeTab = "selected";
    }
    this.websiteSearchTerm = "";
    this.filteredWebsites = [];
    this.showDropdown = false;
  }

  onWebsiteSelectionChange(event: any, websiteId: string): void {
    // This method is kept for compatibility but no longer used by the dropdown.
    // If you still have checkboxes elsewhere, you can keep it.
    const selectedIds: string[] = this.chiefForm.get("websiteIds")?.value || [];

    if (event.target.checked) {
      if (!selectedIds.includes(websiteId)) {
        this.chiefForm.get("websiteIds")?.setValue([...selectedIds, websiteId]);
        this.activeTab = "selected";
      }
    } else {
      this.chiefForm
        .get("websiteIds")
        ?.setValue(selectedIds.filter((id: string) => id !== websiteId));
    }

    this.chiefForm.get("websiteIds")?.markAsTouched();
    this.filterWebsites(); // refresh available list
  }

  removeWebsite(websiteId: string): void {
    const selectedIds: string[] = this.chiefForm.get("websiteIds")?.value || [];
    this.chiefForm
      .get("websiteIds")
      ?.setValue(selectedIds.filter((id: string) => id !== websiteId));
    this.chiefForm.get("websiteIds")?.markAsTouched();

    this.chiefForm.get(`topup_${websiteId}`)?.setValue("");
    this.chiefForm.get(`payout_${websiteId}`)?.setValue("");

    if (this.getSelectedWebsites().length === 0) {
      this.activeTab = "available";
    }
    this.filterWebsites(); // refresh available list
  }

  applyToAll(type: "topup" | "payout") {
    const selectedWebsites = this.getSelectedWebsites();
    if (selectedWebsites.length === 0) return;

    const firstWebsite = selectedWebsites[0];
    const controlName = `${type}_${firstWebsite.websiteId || firstWebsite.id}`;
    const value = this.chiefForm.get(controlName)?.value;

    selectedWebsites.forEach((website) => {
      const control = this.chiefForm.get(
        `${type}_${website.websiteId || website.id}`,
      );
      if (control && value !== null && value !== undefined) {
        control.setValue(value);
        control.markAsTouched();
      }
    });
  }

  onSubmit(): void {
    if (this.loading) return;

    const websiteIds: string[] = this.chiefForm.get("websiteIds")?.value || [];

    if (websiteIds.length === 0) {
      this.snackService.show("Please select at least one website", false, 3000);
      return;
    }

    for (const websiteId of websiteIds) {
      const topupCtrl = this.chiefForm.get(`topup_${websiteId}`);
      const payoutCtrl = this.chiefForm.get(`payout_${websiteId}`);

      const topup = topupCtrl?.value;
      const payout = payoutCtrl?.value;

      topupCtrl?.markAsTouched();
      payoutCtrl?.markAsTouched();

      if (!this.isValidPercentage(topup) || !this.isValidPercentage(payout)) {
        this.snackService.show(
          "Please enter valid Topup & Payout percentage for all selected websites",
          false,
          4000,
        );
        return;
      }
    }

    if (
      this.chiefForm.get("name")?.invalid ||
      this.chiefForm.get("mobile")?.invalid ||
      this.chiefForm.get("email")?.invalid
    ) {
      this.snackService.show(
        "Please fill all required fields correctly",
        false,
        3000,
      );
      return;
    }

    const websitePercentages: Record<string, any> = {};
    websiteIds.forEach((id) => {
      websitePercentages[String(id)] = {
        topupPercentage: Number(this.chiefForm.get(`topup_${id}`)?.value),
        payoutPercentage: Number(this.chiefForm.get(`payout_${id}`)?.value),
      };
    });

    const payload: any = {
      name: this.chiefForm.value.name,
      mobile: this.chiefForm.value.mobile,
      email: this.chiefForm.value.email,
      info: this.chiefForm.value.info,
      active: this.chiefForm.value.isActive,
      balance: 0,
      websitePercentages,
      createdByEntityId: this.currentUserId,
      createdByEntityType: this.role,
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

  private isValidPercentage(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }

  clearForm(): void {
    this.chiefForm.reset({
      name: "",
      mobile: "",
      email: "",
      info: "",
      isActive: true,
      websiteIds: [],
    });

    this.websites.forEach((website) => {
      const wid = website.websiteId || website.id;
      this.chiefForm.get(`topup_${wid}`)?.setValue("");
      this.chiefForm.get(`payout_${wid}`)?.setValue("");
    });

    this.loading = false;
    this.activeTab = "available";
    this.websiteSearchTerm = "";
    this.filteredWebsites = [];
    this.showDropdown = false;
    this.chiefForm.markAsPristine();
    this.chiefForm.markAsUntouched();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.chiefForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  onWebsiteSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value || "";
    this.websiteSearchTerm = val;
    this.filterWebsites();
    // keep dropdown visible when user types
    if (val.trim().length > 0) {
      this.showDropdown = true;
    }
  }
}
