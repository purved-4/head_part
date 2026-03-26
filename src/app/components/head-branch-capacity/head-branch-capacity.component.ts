import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  ValidationErrors,
  AbstractControl,
} from "@angular/forms";
import { UserStateService } from "../../store/user-state.service";
import { HeadService } from "../../pages/services/head.service";
import { BranchService } from "../../pages/services/branch.service";
import { CapacityService } from "../../pages/services/capacity.service";

@Component({
  selector: "app-head-branch-capacity",
  templateUrl: "./head-branch-capacity.component.html",
  styleUrls: ["./head-branch-capacity.component.css"],
})
export class HeadBranchCapacityComponent implements OnInit, OnDestroy {
  capacityForm: FormGroup;
  currentEntityId: any;
  role: any;
  portals: any;

  isLoading = false;
  isSubmitting = false;
  errorMessage = "";
  hasUptoRange = false;

  showAddSuccessPopup = false;
  addSuccessMessage = "";
  private successPopupTimeout: any;

  activeRangeMenu: number | null = null;

  showPortalDropdown = false;
  filteredPortals: any[] = [];
  selectedPortalDomain: string = "";

  get capacityRanges() {
    return this.capacityForm.get("capacityRanges") as FormArray;
  }

  constructor(
    private userStateService: UserStateService,
    private headService: HeadService,
    private branchService: BranchService,
    private capacityService: CapacityService,
    private fb: FormBuilder,
  ) {
    this.capacityForm = this.createForm();
  }

  ngOnInit(): void {
    this.currentEntityId = this.userStateService.getCurrentEntityId();
    this.role = this.userStateService.getRole();

    this.loadPortals();

    // Portal change
    this.capacityForm.get("portalId")?.valueChanges.subscribe((val) => {
      if (val) {
        this.errorMessage = "";

        const selectedPortal = this.portals?.find(
          (w: any) => w.portalId === val,
        );

        this.selectedPortalDomain =
          selectedPortal?.portalDomain || selectedPortal?.domain || "";

        this.loadCapacitiesForPortal();
      } else {
        this.resetRanges();
      }
    });

    this.checkForUptoRange();
  }

  ngOnDestroy(): void {
    if (this.successPopupTimeout) {
      clearTimeout(this.successPopupTimeout);
    }
  }

  // ================= FORM =================

  private createForm(): FormGroup {
    return this.fb.group({
      type: ["PAYOUT"], // ✅ fixed
      portalId: ["", Validators.required],
      capacityRanges: this.fb.array([this.createCapacityRange()]),
    });
  }

  private createCapacityRange(): FormGroup {
    const group = this.fb.group(
      {
        minRange: [{ value: 0, disabled: true }],
        maxRange: ["", [Validators.required, Validators.min(1)]],
        quantity: ["", [Validators.required, Validators.min(1)]],
        time: ["", [Validators.required, Validators.min(1)]],
        upto: [false],
      },
      { validators: this.rangeValidator },
    );

    return group;
  }

  private rangeValidator(group: AbstractControl): ValidationErrors | null {
    const min = group.get("minRange")?.value || 0;
    const max = group.get("maxRange")?.value;
    const upto = group.get("upto")?.value;

    if (!upto && (!max || max <= min)) {
      return { invalidRange: true };
    }
    return null;
  }

  // ================= API =================

  private async loadPortals(): Promise<void> {
    this.isLoading = true;
    try {
      if (this.role.toLowerCase() === "head") {
        this.portals = await this.headService
          .getAllHeadsWithPortalsById(this.currentEntityId)
          .toPromise();
      } else {
        this.portals = await this.branchService
          .getPortalByBranchId(this.currentEntityId)
          .toPromise();
      }

      this.filteredPortals = [...this.portals];
    } catch {
      this.errorMessage = "Failed to load portals";
    } finally {
      this.isLoading = false;
    }
  }

  private async loadCapacitiesForPortal(): Promise<void> {
    const portalId = this.capacityForm.get("portalId")?.value;
    if (!portalId) return;

    this.isLoading = true;

    try {
      const payload = {
        portalId,
        entityType: this.role.toUpperCase(),
        entityId: this.currentEntityId,
      };

      const resp: any = await this.capacityService
        .getPayoutCapacityByPortalId(payload)
        .toPromise();

      const capacities = Array.isArray(resp) ? resp : resp?.capacities || [];

      this.capacityRanges.clear();

      if (capacities.length) {
        capacities.forEach((c: any, i: number) => {
          const g = this.createCapacityRange();

          g.patchValue({
            maxRange: c.upto ? "" : c.maxRange,
            quantity: c.quantity,
            time: c.time,
            upto: c.upto,
          });

          this.capacityRanges.push(g);
        });
      } else {
        this.capacityRanges.push(this.createCapacityRange());
      }

      this.updateMinRanges();
      this.checkForUptoRange();
    } catch {
      this.errorMessage = "Failed to load capacity";
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit(): Promise<void> {
    console.log(this.capacityForm.value);
    if (this.capacityForm.invalid) {
      this.errorMessage = "Fill all required fields";
      console.log(this.capacityForm.errors, this.capacityForm);
      return;
    }

    if (!this.hasUptoRange) {
      this.errorMessage = "At least one upto range required";
      console.log(this.capacityForm.errors, this.capacityForm);
      return;
    }

    this.isSubmitting = true;

    const form = this.capacityForm.getRawValue();

    const payload = {
      entityType: this.role.toUpperCase(),
      entityId: this.currentEntityId,
      portalId: form.portalId,
      ranges: form.capacityRanges.map((r: any) => ({
        maxRange: r.upto ? 0 : Number(r.maxRange),
        quantity: Number(r.quantity),
        time: Number(r.time),
        upto: r.upto,
      })),
    };

    try {
      console.log(payload);
      await this.capacityService.addPayoutCapacity(payload).toPromise();

      this.showAddSuccess("Capacity saved successfully");
      this.resetRanges();
    } catch (err: any) {
      this.errorMessage = err?.error?.message || "Save failed";
    } finally {
      this.isSubmitting = false;
    }
  }

  // ================= RANGE =================

  addCapacityRange(): void {
    if (this.hasUptoRange) {
      this.errorMessage = "Upto already exists";
      return;
    }

    this.capacityRanges.push(this.createCapacityRange());
    this.updateMinRanges();
  }

  updateMinRanges(): void {
    this.capacityRanges.controls.forEach((c, i) => {
      if (i === 0) {
        c.get("minRange")?.setValue(0);
      } else {
        const prev = this.capacityRanges.at(i - 1).get("maxRange")?.value;
        c.get("minRange")?.setValue(prev ? prev : 0);
      }
    });
  }

  checkForUptoRange(): void {
    this.hasUptoRange = this.capacityRanges.controls.some(
      (r) => r.get("upto")?.value,
    );
  }

  resetRanges(): void {
    this.capacityRanges.clear();
    this.capacityRanges.push(this.createCapacityRange());
    this.hasUptoRange = false;
    this.selectedPortalDomain = "";
  }

  // ================= UI =================

  private showAddSuccess(msg: string) {
    this.addSuccessMessage = msg;
    this.showAddSuccessPopup = true;

    this.successPopupTimeout = setTimeout(() => {
      this.showAddSuccessPopup = false;
    }, 3000);
  }

  // ================= PORTAL SEARCH =================

  onPortalSearch(event: any): void {
    const value = event.target.value?.toLowerCase() || "";

    this.selectedPortalDomain = value;

    this.filteredPortals = this.portals?.filter((w: any) =>
      (w.portalDomain || w.domain || "").toLowerCase().includes(value),
    );

    this.showPortalDropdown = true;
  }

  selectPortal(portal: any): void {
    this.capacityForm.patchValue({
      portalId: portal.portalId,
    });

    this.selectedPortalDomain = portal.portalDomain || portal.domain;

    this.showPortalDropdown = false;
  }

  onPortalBlur(): void {
    setTimeout(() => {
      this.showPortalDropdown = false;
    }, 200);
  }

  removeCapacityRange(index: number): void {
    this.capacityRanges.removeAt(index);
    this.updateMinRanges();
    this.checkForUptoRange();
  }

  onUptoChange(index: number): void {
    const control = this.capacityRanges.at(index);
    const isUpto = control.get("upto")?.value;
    const maxControl = control.get("maxRange");

    if (isUpto) {
      // remove validators
      maxControl?.clearValidators();
      maxControl?.setValue("");
    } else {
      // add back validators
      maxControl?.setValidators([Validators.required, Validators.min(1)]);
    }

    maxControl?.updateValueAndValidity();

    this.checkForUptoRange();
  }
}
