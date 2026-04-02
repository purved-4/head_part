import { AfterViewInit, Component, OnInit } from "@angular/core";
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
import { COUNTRY_CODES } from "../../../../utils/constants";
import { ViewChild, ElementRef } from "@angular/core";
@Component({
  selector: "app-add-branch",
  templateUrl: "./add-branch.component.html",
  styleUrls: ["./add-branch.component.scss"],
})
export class AddBranchComponent implements OnInit{
  chiefForm: FormGroup;
  loading = false;
  portals: any[] = [];
  activeTab: "available" | "selected" = "available";
  currentUserId: string | null = "";
  role: string | null = "";
  // @ViewChild("phoneInput") phoneInputRef!: ElementRef;
  // Search properties
  portalSearchTerm: string = "";
  filteredPortals: any[] = [];
  showDropdown = false;
  availableSearchTerm: string = "";
  selectedSearchTerm: string = "";
currentBranchId: string = '';
selectedPortalForPopup: any = null;
showPopup: boolean = false;
countryCodes = COUNTRY_CODES;
selectedCountry = this.countryCodes.find(c => c.code === 'IN') || this.countryCodes[0];
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
      // mobile: ["", [Validators.required, Validators.pattern(/^[0-9]{15}$/)]],
      mobile: ["", [Validators.required, Validators.maxLength(15)]],
      email: ["", [Validators.required, Validators.email]],
       userEmail: ["", [Validators.required, Validators.email]],  
  userPassword: ["", Validators.required],        
      info: [""],
      isActive: [true],
      portalIds: [[], Validators.required],
    });
  }

  ngOnInit() {
    this.currentUserId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();
    this.loadPortals();
  }

  loadPortals() {
    this.headService.getAllHeadsWithPortalsById(this.currentUserId).subscribe({
      next: (res: any) => {
        this.portals = res;

        this.initializePortalControls();
        this.filterPortals(); // initial filter (empty)
      },
      error: (err) => {
        console.error("Error loading portals:", err);
        this.snackService.show(
          "Failed to load portals. Please try again.",
          false,
          3000,
        );
      },
    });
  }

  initializePortalControls() {
    this.portals.forEach((portal) => {
      const wid = portal.portalId || portal.id;
      if (!this.chiefForm.contains(`first_topup_${wid}`)) {
        this.chiefForm.addControl(
          `first_topup_${wid}`,
          new FormControl("", [
            Validators.required,
            Validators.min(0),
            Validators.max(100),
          ]),
        );
      }
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

  isPortalSelected(portalId: string): boolean {
    const selectedIds: string[] = this.chiefForm.get("portalIds")?.value || [];
    return selectedIds.includes(portalId);
  }



  getAvailablePortals(): any[] {
    const selectedIds: string[] = this.chiefForm.get("portalIds")?.value || [];

    return this.portals
      .filter((w) => !selectedIds.includes(w.portalId || w.id))
      .filter((w) =>
        (w.domain || w.portalDomain || "")
          .toLowerCase()
          .includes(this.availableSearchTerm),
      );
  }


  getSelectedPortals(): any[] {
    const selectedIds: string[] = this.chiefForm.get("portalIds")?.value || [];

    return this.portals
      .filter((w) => selectedIds.includes(w.portalId || w.id))
      .filter((w) =>
        (w.domain || w.portalDomain || "")
          .toLowerCase()
          .includes(this.selectedSearchTerm),
      );
  }

  // Getter for selected count
  get selectedPortalCount(): number {
    return (this.chiefForm.get("portalIds")?.value || []).length;
  }

  // Search filter method – updates filteredPortals based on available portals
  filterPortals(): void {
    const term = this.portalSearchTerm.trim().toLowerCase();
    const available = this.getAvailablePortals();
    if (!term) {
      this.filteredPortals = available; // show all available when search empty
    } else {
      this.filteredPortals = available.filter(
        (w) =>
          (w.portalDomain || w.domain || w.name || "")
            .toLowerCase()
            .includes(term) ||
          (w.portalId || w.id || "").toLowerCase().includes(term),
      );
    }
  }

  hideDropdown(): void {
    setTimeout(() => (this.showDropdown = false), 200);
  }

  // Called when a portal is clicked in the dropdown
  selectPortal(portal: any): void {
    const portalId = portal.portalId || portal.id;
    const selectedIds: string[] = this.chiefForm.get("portalIds")?.value || [];
    if (!selectedIds.includes(portalId)) {
      this.chiefForm.get("portalIds")?.setValue([...selectedIds, portalId]);
      this.chiefForm.get("portalIds")?.markAsTouched();
      // Optionally switch to Selected tab
      this.activeTab = "selected";
    }
    this.portalSearchTerm = "";
    this.filteredPortals = [];
    this.showDropdown = false;
  }

  onPortalSelectionChange(event: any, portalId: string): void {
    // This method is kept for compatibility but no longer used by the dropdown.
    // If you still have checkboxes elsewhere, you can keep it.
    const selectedIds: string[] = this.chiefForm.get("portalIds")?.value || [];

    if (event.target.checked) {
      if (!selectedIds.includes(portalId)) {
        this.chiefForm.get("portalIds")?.setValue([...selectedIds, portalId]);
        this.activeTab = "selected";
      }
    } else {
      this.chiefForm
        .get("portalIds")
        ?.setValue(selectedIds.filter((id: string) => id !== portalId));
    }

    this.chiefForm.get("portalIds")?.markAsTouched();
    this.filterPortals(); // refresh available list
  }

  removePortal(portalId: string): void {
    const selectedIds: string[] = this.chiefForm.get("portalIds")?.value || [];
    this.chiefForm
      .get("portalIds")
      ?.setValue(selectedIds.filter((id: string) => id !== portalId));
    this.chiefForm.get("portalIds")?.markAsTouched();
    this.chiefForm.get(`first_topup_${portalId}`)?.setValue("");

    this.chiefForm.get(`topup_${portalId}`)?.setValue("");
    this.chiefForm.get(`payout_${portalId}`)?.setValue("");

    if (this.getSelectedPortals().length === 0) {
      this.activeTab = "available";
    }
    this.filterPortals(); // refresh available list
  }

  applyToAll(type: "topup" | "payout" | "first_topup") {
    const selectedPortals = this.getSelectedPortals();
    if (selectedPortals.length === 0) return;

    const firstPortal = selectedPortals[0];
    const controlName = `${type}_${firstPortal.portalId || firstPortal.id}`;
    const value = this.chiefForm.get(controlName)?.value;

    selectedPortals.forEach((portal) => {
      const control = this.chiefForm.get(
        `${type}_${portal.portalId || portal.id}`,
      );
      if (control && value !== null && value !== undefined) {
        control.setValue(value);
        control.markAsTouched();
      }
    });
  }

 onSubmit(): void {
  if (this.loading) return;

  const portalIds: string[] = this.chiefForm.get("portalIds")?.value || [];

const mobileNumber = this.chiefForm.value.mobile;
const fullMobile = this.selectedCountry.dialCode + mobileNumber;

  // Portal validation
  if (portalIds.length === 0) {
    this.snackService.show("Please select at least one portal", false, 3000);
    return;
  }

  for (const portalId of portalIds) {
    const fttCtrl = this.chiefForm.get(`first_topup_${portalId}`);
    const topupCtrl = this.chiefForm.get(`topup_${portalId}`);
    const payoutCtrl = this.chiefForm.get(`payout_${portalId}`);

    const ftt = fttCtrl?.value;
    const topup = topupCtrl?.value;
    const payout = payoutCtrl?.value;

    fttCtrl?.markAsTouched();
    topupCtrl?.markAsTouched();
    payoutCtrl?.markAsTouched();

    if (
      !this.isValidPercentage(ftt) ||
      !this.isValidPercentage(topup) ||
      !this.isValidPercentage(payout)
    ) {
      this.snackService.show(
        "Please enter valid Topup, Payout & FTT percentages for all selected portals",
        false,
        4000
      );
      return;
    }
  }

  // Form validation
  if (
    this.chiefForm.get("name")?.invalid ||
    this.chiefForm.get("mobile")?.invalid ||
    this.chiefForm.get("email")?.invalid ||
    this.chiefForm.get("userEmail")?.invalid ||
    this.chiefForm.get("userPassword")?.invalid
  ) {
    this.snackService.show(
      "Please fill all required fields correctly",
      false,
      3000
    );
    return;
  }

  // Portal percentages payload
  const portalPercentages: Record<string, any> = {};
  portalIds.forEach((id) => {
    portalPercentages[String(id)] = {
      fttPercentage: Number(this.chiefForm.get(`first_topup_${id}`)?.value),
      topupPercentage: Number(this.chiefForm.get(`topup_${id}`)?.value),
      payoutPercentage: Number(this.chiefForm.get(`payout_${id}`)?.value),
    };
  });

  // Final payload
  const payload: any = {
    name: this.chiefForm.value.name,
      mobile: fullMobile,  
    email: this.chiefForm.value.email,
    userEmail: this.chiefForm.value.userEmail,
    userPassword: this.chiefForm.value.userPassword,
    info: this.chiefForm.value.info,
    active: this.chiefForm.value.isActive,
    balance: 0,
    portalPercentages,
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
        3000
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
        userEmail: "",    
  userPassword: "", 
      info: "",
      isActive: true,
      portalIds: [],
    });

    this.portals.forEach((portal) => {
      const wid = portal.portalId || portal.id;
      this.chiefForm.get(`first_topup_${wid}`)?.setValue("");

      this.chiefForm.get(`topup_${wid}`)?.setValue("");
      this.chiefForm.get(`payout_${wid}`)?.setValue("");
    });

    this.loading = false;
    this.activeTab = "available";
    this.portalSearchTerm = "";
    this.filteredPortals = [];
    this.showDropdown = false;
    this.chiefForm.markAsPristine();
    this.chiefForm.markAsUntouched();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.chiefForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  onPortalSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value || "";
    this.portalSearchTerm = val;
    this.filterPortals();
    // keep dropdown visible when user types
    if (val.trim().length > 0) {
      this.showDropdown = true;
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

openPopup(portal: any) {
  this.selectedPortalForPopup = portal;

  // ✅ IMPORTANT: pass correct branchId
  this.currentBranchId = this.currentUserId as string;

  this.showPopup = true;
}
}

