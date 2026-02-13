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
  currentUserId: any;
  role: any;
  websites: any;
  isLoading = false;
  isSubmitting = false;
  errorMessage = "";
  hasUptoRange = false;

  // ✅ Toast properties
  showAddSuccessPopup = false;
  addSuccessMessage = "";
  private successPopupTimeout: any;

  // Dropdown menu state - tracks which range menu is open
  activeRangeMenu: number | null = null;

  // Transaction type options
  transactionTypes = [
    { value: "TOPUP", label: "Topup" },
    { value: "PAYOUT", label: "Payout" },
  ];

  // Transaction mode options
  transactionModes = [
    { value: "UPI", label: "UPI" },
    { value: "BANK", label: "Bank Transfer" },
  ];

  showWebsiteDropdown = false;
  filteredWebsites: any[] = [];
  selectedWebsiteDomain: string = "";

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

    // Start with type and mode disabled until website selected
    this.capacityForm.get("type")?.disable();
    this.capacityForm.get("mode")?.disable();
  }

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getCurrentRoleId();
    this.role = this.userStateService.getRole();
    this.loadWebsites();
    this.loadExistingCapacities();

    // Website selection value changes
    this.capacityForm.get("websiteId")?.valueChanges.subscribe((val) => {
      if (val) {
        this.capacityForm.get("type")?.enable({ emitEvent: false });
        this.errorMessage = "";

        const selectedWebsite = this.websites?.find(
          (w: any) => w.websiteId === val,
        );
        if (selectedWebsite) {
          this.selectedWebsiteDomain =
            selectedWebsite.websiteDomain || selectedWebsite.domain;
        }

        const type = this.capacityForm.get("type")?.value;
        const mode = this.capacityForm.get("mode")?.value;
        if (type === "TOPUP" && mode) {
          this.loadCapacitiesForWebsite();
        } else if (type) {
          this.loadCapacitiesForWebsite();
        }
      } else {
        this.capacityForm.get("type")?.reset();
        this.capacityForm.get("type")?.disable({ emitEvent: false });
        this.capacityForm.get("mode")?.reset();
        this.capacityForm.get("mode")?.disable({ emitEvent: false });

        this.capacityRanges.clear();
        this.capacityRanges.push(this.createCapacityRange());
        this.hasUptoRange = false;
        this.selectedWebsiteDomain = "";
      }
    });

    // Type change handler
    this.capacityForm.get("type")?.valueChanges.subscribe((type) => {
      this.onTypeChange();

      if (type === "PAYOUT") {
        this.capacityForm.get("mode")?.reset();
        this.capacityForm.get("mode")?.disable({ emitEvent: false });

        this.capacityRanges.clear();
        this.capacityRanges.push(this.createCapacityRange());
        this.hasUptoRange = false;
      } else if (type === "TOPUP") {
        if (this.capacityForm.get("websiteId")?.value) {
          this.capacityForm.get("mode")?.enable({ emitEvent: false });
        }
        const mode = this.capacityForm.get("mode")?.value;
        if (mode) {
          this.loadCapacitiesForWebsite();
        }
      }
    });

    // Mode change handler
    this.capacityForm.get("mode")?.valueChanges.subscribe((mode) => {
      const websiteId = this.capacityForm.get("websiteId")?.value;
      const type = this.capacityForm.get("type")?.value;
      if (websiteId && type === "TOPUP" && mode) {
        this.loadCapacitiesForWebsite();
      }
    });

    this.checkForUptoRange();
  }

  // ============= TOAST METHODS =============

  closeAddSuccessPopup(): void {
    clearTimeout(this.successPopupTimeout);
    this.showAddSuccessPopup = false;
    this.addSuccessMessage = "";
  }

  private showAddSuccess(message: string): void {
    this.addSuccessMessage = message;
    this.showAddSuccessPopup = true;
    this.successPopupTimeout = setTimeout(() => {
      this.closeAddSuccessPopup();
    }, 3000);
  }

  // ============= DROPDOWN MENU METHODS =============

  toggleRangeMenu(index: number): void {
    console.log("Toggle clicked for range:", index);
    if (this.activeRangeMenu === index) {
      this.activeRangeMenu = null;
      console.log("Closing range menu");
    } else {
      this.activeRangeMenu = index;
      console.log("Opening range menu:", index);
    }
  }

  closeRangeMenu(): void {
    console.log("Closing all range menus");
    this.activeRangeMenu = null;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isRangeButton = target.closest(".range-menu-button");
    const isRangeMenu = target.closest(".range-menu-dropdown");

    if (!isRangeButton && !isRangeMenu && this.activeRangeMenu !== null) {
      console.log("Clicked outside, closing menu");
      this.activeRangeMenu = null;
    }
  }

  @HostListener("click", ["$event"])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest(".range-menu-dropdown")) {
      event.stopPropagation();
    }
  }

  ngOnDestroy(): void {
    if (this.successPopupTimeout) {
      clearTimeout(this.successPopupTimeout);
    }
  }

  // ============= FORM METHODS =============

  private createForm(): FormGroup {
    return this.fb.group({
      type: ["TOPUP", Validators.required],
      mode: ["UPI"],
      websiteId: ["", Validators.required],
      capacityRanges: this.fb.array([this.createCapacityRange()]),
    });
  }

  private createCapacityRange(): FormGroup {
    const group = this.fb.group(
      {
        minRange: [{ value: 0, disabled: true }, Validators.required],
        maxRange: ["", [Validators.min(1)]],
        quantity: ["", [Validators.required, Validators.min(1)]],
        time: ["", [Validators.required, Validators.min(1)]],
        upto: [false],
      },
      {
        validators: this.rangeGroupValidator.bind(this),
      },
    );

    this.setMaxValidators(group);

    group.get("maxRange")?.valueChanges.subscribe(() => {
      this.updateMinRanges();
      group.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });

    group.get("upto")?.valueChanges.subscribe(() => {
      this.setMaxValidators(group);
      group.updateValueAndValidity({ onlySelf: true });
    });

    return group;
  }

  private rangeGroupValidator(group: AbstractControl): ValidationErrors | null {
    const g = group as FormGroup;
    const upto = !!g.get("upto")?.value;
    const minVal = Number(g.get("minRange")?.value) || 0;
    const maxControl = g.get("maxRange");
    const maxValRaw = maxControl?.value;
    const maxVal =
      maxValRaw === "" || maxValRaw === null ? NaN : Number(maxValRaw);

    if (upto) {
      if (maxControl?.errors) {
        const errors = { ...maxControl.errors };
        delete errors["required"];
        delete errors["minGreater"];
        if (Object.keys(errors).length === 0) {
          maxControl.setErrors(null);
        } else {
          maxControl.setErrors(errors);
        }
      }
      return null;
    }

    if (isNaN(maxValRaw) || maxValRaw === "" || maxValRaw === null) {
      maxControl?.setErrors({ ...(maxControl.errors || {}), required: true });
      return { maxInvalid: true };
    }

    if (isNaN(maxVal) || maxVal <= minVal) {
      maxControl?.setErrors({ ...(maxControl.errors || {}), minGreater: true });
      return { maxInvalid: true };
    }

    if (maxControl?.errors) {
      const cleaned = { ...maxControl.errors };
      delete cleaned["required"];
      delete cleaned["minGreater"];
      if (Object.keys(cleaned).length === 0) {
        maxControl.setErrors(null);
      } else {
        maxControl.setErrors(cleaned);
      }
    }

    return null;
  }

  private setMaxValidators(rangeGroup: FormGroup): void {
    const upto = !!rangeGroup.get("upto")?.value;
    const maxControl = rangeGroup.get("maxRange");

    if (upto) {
      maxControl?.clearValidators();
      maxControl?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    } else {
      maxControl?.setValidators([Validators.required, Validators.min(1)]);
      maxControl?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    }
  }

  checkForUptoRange(): void {
    const ranges = this.capacityRanges.controls;
    this.hasUptoRange = ranges.some(
      (range) => range.get("upto")?.value === true,
    );

    const uptoIndex = ranges.findIndex(
      (range) => range.get("upto")?.value === true,
    );
    if (uptoIndex !== -1 && uptoIndex !== ranges.length - 1) {
      this.moveUptoToEnd(uptoIndex);
    }

    this.capacityRanges.controls.forEach((g) => {
      this.setMaxValidators(g as FormGroup);
      (g as FormGroup).updateValueAndValidity({
        onlySelf: true,
        emitEvent: false,
      });
    });
  }

  moveUptoToEnd(uptoIndex: number): void {
    const rangeToMove = this.capacityRanges.at(uptoIndex);
    this.capacityRanges.removeAt(uptoIndex);
    this.capacityRanges.push(rangeToMove);
    this.updateMinRanges();
  }

  // ============= API METHODS =============

  private async loadWebsites(): Promise<void> {
    this.isLoading = true;
    try {
      if (this.role.toString().toLowerCase() === "head") {
        this.websites = await this.headService
          .getAllHeadsWithWebsitesById(this.currentUserId)
          .toPromise();
      } else if (this.role.toString().toLowerCase() === "branch") {
        this.websites = await this.branchService
          .getWebsiteByBranchId(this.currentUserId)
          .toPromise();
      }
      this.filteredWebsites = [...this.websites];
    } catch (error) {
      console.error("Error loading websites:", error);
      this.errorMessage = "Failed to load websites. Please try again.";
    } finally {
      this.isLoading = false;
    }
  }

  private async loadExistingCapacities(): Promise<void> {
    // Implement if needed
  }

  private async loadCapacitiesForWebsite(): Promise<void> {
    const websiteId = this.capacityForm.get("websiteId")?.value;
    const type = this.capacityForm.get("type")?.value;
    const mode = type === "TOPUP" ? this.capacityForm.get("mode")?.value : null;

    if (!websiteId || !type) {
      return;
    }

    this.isLoading = true;
    try {
      const payload = {
        websiteId,
        entityType: this.role?.toUpperCase(),
        entityId: this.currentUserId,
        type,
        mode,
      };

      const resp: any = await this.capacityService
        .getCapacityByWebsiteId(payload)
        .toPromise();

      const capacities = resp?.capacities || resp?.data || [];

      if (capacities && capacities.length) {
        this.capacityRanges.clear();

        capacities.forEach((c: any, idx: number) => {
          const g = this.createCapacityRange();

          let min = 0;
          if (idx === 0) {
            min = 0;
          } else {
            const prev = capacities[idx - 1];
            const prevMaxRaw = prev?.maxRange;
            const prevMax =
              prevMaxRaw === "" || prevMaxRaw === null
                ? NaN
                : Number(prevMaxRaw);
            min = !isNaN(prevMax) && prevMax >= 0 ? prevMax + 1 : 0;
          }

          const isUpto = !!c.upto;
          g.get("upto")?.setValue(isUpto);

          if (isUpto) {
            g.get("maxRange")?.setValue(c.maxRange === 0 ? "" : c.maxRange);
            g.get("minRange")?.setValue(min);
            g.get("minRange")?.disable({ emitEvent: false });
          } else {
            g.get("maxRange")?.setValue(
              c.maxRange != null && c.maxRange !== 0 ? c.maxRange : "",
            );
            g.get("minRange")?.setValue(c.minRange != null ? c.minRange : min);
            g.get("minRange")?.enable({ emitEvent: false });
          }

          g.get("quantity")?.setValue(c.quantity != null ? c.quantity : "");
          g.get("time")?.setValue(c.time != null ? c.time : "");

          this.setMaxValidators(g);
          (g as FormGroup).updateValueAndValidity({
            onlySelf: true,
            emitEvent: false,
          });

          this.capacityRanges.push(g);
        });

        this.updateMinRanges();
        this.checkForUptoRange();
      } else {
        this.capacityRanges.clear();
        this.capacityRanges.push(this.createCapacityRange());
        this.hasUptoRange = false;
      }
    } catch (err) {
      console.error("Error loading capacities for website:", err);
      this.errorMessage = "Failed to load capacity configuration.";
    } finally {
      this.isLoading = false;
    }
  }

  // ============= RANGE MANAGEMENT METHODS =============

  addCapacityRange(): void {
    if (this.hasUptoRange) {
      this.errorMessage = 'Cannot add new range after an "upto" range.';
      return;
    }

    const lastRange = this.capacityRanges.at(this.capacityRanges.length - 1);
    if (lastRange.valid) {
      const lastMax = lastRange.get("maxRange")?.value;
      const newRange = this.createCapacityRange();
      newRange
        .get("minRange")
        ?.setValue(lastMax ? parseInt(lastMax, 10) + 1 : 0);
      this.setMaxValidators(newRange);
      this.capacityRanges.push(newRange);
      this.errorMessage = "";
      this.updateMinRanges();
    } else {
      this.errorMessage =
        "Please complete the current range before adding a new one.";
    }
  }

  removeCapacityRange(index: number): void {
    if (this.capacityRanges.length > 1) {
      this.capacityRanges.removeAt(index);
      this.updateMinRanges();
      this.checkForUptoRange();
      this.closeRangeMenu();
    }
  }

  updateMinRanges(): void {
    this.capacityRanges.controls.forEach((control, index) => {
      if (index === 0) {
        control.get("minRange")?.setValue(0);
      } else {
        const prevMaxRaw = this.capacityRanges
          .at(index - 1)
          .get("maxRange")?.value;
        const prevMax =
          prevMaxRaw === "" || prevMaxRaw === null ? NaN : Number(prevMaxRaw);
        const min = !isNaN(prevMax) && prevMax >= 0 ? prevMax + 1 : 0;
        control.get("minRange")?.setValue(min);
      }

      if (control.get("upto")?.value) {
        control.get("minRange")?.disable({ emitEvent: false });
      } else {
        control.get("minRange")?.enable({ emitEvent: false });
      }

      (control as FormGroup).updateValueAndValidity({
        onlySelf: true,
        emitEvent: false,
      });
    });
  }

  onTypeChange(): void {
    const type = this.capacityForm.get("type")?.value;
    if (type === "PAYOUT") {
      this.capacityForm.get("mode")?.reset();
      this.capacityForm.get("mode")?.clearValidators();
      this.capacityForm.get("mode")?.disable({ emitEvent: false });
      this.loadCapacitiesForWebsite();
    } else {
      this.capacityForm.get("mode")?.setValidators(Validators.required);
      if (this.capacityForm.get("websiteId")?.value) {
        this.capacityForm.get("mode")?.enable({ emitEvent: false });
      }
    }
    this.capacityForm.get("mode")?.updateValueAndValidity();
  }

  onMaxRangeChange(index: number): void {
    const currentRange = this.capacityRanges.at(index);
    const maxRange = currentRange.get("maxRange")?.value;

    if (
      index < this.capacityRanges.length - 1 &&
      !currentRange.get("upto")?.value
    ) {
      const nextRange = this.capacityRanges.at(index + 1);
      nextRange.get("minRange")?.setValue(parseInt(maxRange, 10) + 1 || 0);
      (nextRange as FormGroup).updateValueAndValidity({ onlySelf: true });
    }

    (currentRange as FormGroup).updateValueAndValidity({ onlySelf: true });
  }

  onUptoChange(index: number): void {
    const currentRange = this.capacityRanges.at(index) as FormGroup;
    const isUpto = currentRange.get("upto")?.value;

    if (isUpto) {
      let min = 0;
      if (index === 0) {
        min = 0;
      } else {
        const prevMaxRaw = this.capacityRanges
          .at(index - 1)
          .get("maxRange")?.value;
        const prevMax =
          prevMaxRaw === "" || prevMaxRaw === null ? NaN : Number(prevMaxRaw);
        min = !isNaN(prevMax) && prevMax >= 0 ? prevMax + 1 : 0;
      }

      currentRange.get("minRange")?.setValue(min);
      currentRange.get("minRange")?.disable({ emitEvent: false });
      currentRange.get("maxRange")?.setValue("");
      this.setMaxValidators(currentRange);
      currentRange.get("maxRange")?.updateValueAndValidity({ onlySelf: true });

      const idx = index;
      if (idx !== this.capacityRanges.length - 1) {
        this.moveUptoToEnd(idx);
      }

      this.hasUptoRange = true;
    } else {
      currentRange.get("minRange")?.enable({ emitEvent: false });
      if (index === 0) {
        currentRange.get("minRange")?.setValue(0);
      } else {
        const previousMax = this.capacityRanges
          .at(index - 1)
          .get("maxRange")?.value;
        currentRange
          .get("minRange")
          ?.setValue(previousMax ? parseInt(previousMax, 10) + 1 : 0);
      }

      this.setMaxValidators(currentRange);
      currentRange.get("maxRange")?.updateValueAndValidity({ onlySelf: true });
      this.checkForUptoRange();
    }

    this.capacityRanges.controls.forEach((g) =>
      (g as FormGroup).updateValueAndValidity({
        onlySelf: true,
        emitEvent: false,
      }),
    );
  }

  // ============= SUBMIT METHOD =============

  async onSubmit(): Promise<void> {
    if (this.capacityForm.invalid) {
      this.markFormGroupTouched(this.capacityForm);
      this.errorMessage = "Please fill all required fields correctly.";
      return;
    }

    const hasUpto = this.capacityRanges.controls.some(
      (range) => range.get("upto")?.value === true,
    );
    if (!hasUpto) {
      this.errorMessage = 'At least one range must be marked as "upto".';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = "";

    const formValue = this.capacityForm.getRawValue();

    const capacities = formValue.capacityRanges.map((range: any) => {
      const isUpto = !!range.upto;
      const payloadRange: any = {
        maxRange: isUpto ? 0 : range.maxRange ? Number(range.maxRange) : 0,
        quantity: Number(range.quantity),
        time: Number(range.time),
        upto: isUpto,
      };
      return payloadRange;
    });

    const capacityData = {
      entityType: this.role.toUpperCase(),
      entityId: this.currentUserId,
      type: formValue.type,
      websiteId: formValue.websiteId,
      mode: formValue.type === "TOPUP" ? formValue.mode : null,
      capacities: capacities,
    };

    try {
      const response = await this.capacityService
        .addCapacity(capacityData)
        .toPromise();

      // ✅ Show success toast instead of inline message
      this.showAddSuccess("Capacity added successfully!");

      const websiteId = this.capacityForm.get("websiteId")?.value;
      const type = this.capacityForm.get("type")?.value;
      const mode = this.capacityForm.get("mode")?.value;

      this.capacityForm.reset();
      this.capacityForm.get("websiteId")?.setValue(websiteId);
      this.capacityForm.get("type")?.setValue(type);
      this.capacityForm.get("mode")?.setValue(mode);

      this.capacityRanges.clear();
      this.capacityRanges.push(this.createCapacityRange());
      this.hasUptoRange = false;
      this.closeRangeMenu();
    } catch (error: any) {
      console.error("Error adding capacity:", error);
      this.errorMessage =
        error.error?.message || "Failed to add capacity. Please try again.";
    } finally {
      this.isSubmitting = false;
    }
  }

  // ============= WEBSITE SEARCH METHODS =============

  onWebsiteSearch(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.showWebsiteDropdown = true;

    if (searchTerm.trim() === "") {
      this.filteredWebsites = [...this.websites];
    } else {
      this.filteredWebsites = this.websites.filter((website: any) => {
        const domain = (
          website.websiteDomain ||
          website.domain ||
          ""
        ).toLowerCase();
        const id = (website.websiteId || "").toString().toLowerCase();
        return domain.includes(searchTerm) || id.includes(searchTerm);
      });
    }
  }

  selectWebsite(website: any): void {
    this.capacityForm.get("websiteId")?.setValue(website.websiteId);
    this.selectedWebsiteDomain = website.websiteDomain || website.domain;
    this.showWebsiteDropdown = false;

    const currentType = this.capacityForm.get("type")?.value;
    if (currentType) {
      this.loadCapacitiesForWebsite();
    }
  }

  onWebsiteBlur(): void {
    setTimeout(() => {
      this.showWebsiteDropdown = false;
    }, 200);
  }

  // ============= UTILITY METHODS =============

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ============= OPTIONAL METHODS (KEPT FOR COMPLETENESS) =============

  duplicateRange(index: number): void {
    if (this.hasUptoRange) {
      this.errorMessage = 'Cannot duplicate range after an "upto" range.';
      return;
    }

    const originalRange = this.capacityRanges.at(index) as FormGroup;
    const originalValue = originalRange.getRawValue();

    const newRange = this.createCapacityRange();

    newRange.get("maxRange")?.setValue(originalValue.maxRange);
    newRange.get("quantity")?.setValue(originalValue.quantity);
    newRange.get("time")?.setValue(originalValue.time);
    newRange.get("upto")?.setValue(false);

    if (index < this.capacityRanges.length - 1) {
      const currentMax = originalValue.maxRange;
      newRange
        .get("minRange")
        ?.setValue(currentMax ? parseInt(currentMax, 10) + 1 : 0);
    } else {
      const lastMax = originalValue.maxRange;
      newRange
        .get("minRange")
        ?.setValue(lastMax ? parseInt(lastMax, 10) + 1 : 0);
    }

    this.setMaxValidators(newRange);
    this.capacityRanges.insert(index + 1, newRange);
    this.updateMinRanges();
    this.closeRangeMenu();
    this.errorMessage = "";
  }

  moveRangeUp(index: number): void {
    if (index > 0) {
      const rangeToMove = this.capacityRanges.at(index);
      this.capacityRanges.removeAt(index);
      this.capacityRanges.insert(index - 1, rangeToMove);
      this.updateMinRanges();
      this.checkForUptoRange();
      this.closeRangeMenu();
    }
  }

  moveRangeDown(index: number): void {
    if (index < this.capacityRanges.length - 1) {
      const rangeToMove = this.capacityRanges.at(index);
      this.capacityRanges.removeAt(index);
      this.capacityRanges.insert(index + 1, rangeToMove);
      this.updateMinRanges();
      this.checkForUptoRange();
      this.closeRangeMenu();
    }
  }
}
