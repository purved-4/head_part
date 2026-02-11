import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
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

interface Website {
  websiteId: string;
  websiteDomain?: string;
  domain?: string;
  currency?: string;
}

@Component({
  selector: "app-head-branch-capacity",
  templateUrl: "./head-branch-capacity.component.html",
  styleUrls: ["./head-branch-capacity.component.css"],
})
export class HeadBranchCapacityComponent implements OnInit {
  capacityForm: FormGroup;
  currentUserId: any;
  role: any;
  websites: Website[] = [];
  isLoading = false;
  isSubmitting = false;
  successMessage = "";
  errorMessage = "";
  hasUptoRange = false;

  // Color themes based on role
  roleColors = {
    head: {
      primary: "#E67A00",
      secondary: "#FFB366",
      bg: "#FFF9F2",
      font: "#FFFFFF",
      border: "#CC6A00",
      hover: "#FF8A1A",
      glow: "rgba(230,122,0,0.50)",
    },
    branch: {
      primary: "#FFC61A",
      secondary: "#FFE699",
      bg: "#FFFDF2",
      font: "#1F2937",
      border: "#E6B800",
      hover: "#FFD54F",
      glow: "rgba(255,198,26,0.50)",
    },
  };

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

  // Website search properties
  showWebsiteDropdown = false;
  filteredWebsites: Website[] = [];
  selectedWebsiteDomain: string = "";
  websiteSearchTimeout: any;

  get currentColors() {
    return (
      this.roleColors[
        this.role?.toLowerCase() as keyof typeof this.roleColors
      ] || this.roleColors.head
    );
  }

  get capacityRanges() {
    return this.capacityForm.get("capacityRanges") as FormArray;
  }

  constructor(
    private userStateService: UserStateService,
    private headService: HeadService,
    private branchService: BranchService,
    private capacityService: CapacityService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.capacityForm = this.createForm();

    // start with type and mode disabled until website selected
    this.capacityForm.get("type")?.disable();
    this.capacityForm.get("mode")?.disable();
  }

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getCurrentRoleId();
    this.role = this.userStateService.getRole();
    this.loadWebsites();

    // when website is selected -> enable type
    this.capacityForm.get("websiteId")?.valueChanges.subscribe((val) => {
      if (val) {
        // enable type selection
        this.capacityForm.get("type")?.enable({ emitEvent: false });
        this.errorMessage = "";

        // Update selected website domain
        const selectedWebsite = this.websites?.find(
          (w: Website) => w.websiteId === val,
        );
        if (selectedWebsite) {
          this.selectedWebsiteDomain =
            selectedWebsite.websiteDomain || selectedWebsite.domain || "";
        }

        // if type is already selected and is TOPUP and mode selected -> fetch config
        const type = this.capacityForm.get("type")?.value;
        const mode = this.capacityForm.get("mode")?.value;
        if (type === "TOPUP" && mode) {
          this.loadCapacitiesForWebsite();
        } else if (type) {
          // For PAYOUT or when mode not selected but type is set
          this.loadCapacitiesForWebsite();
        }
      } else {
        // no website selected: disable type & mode and reset ranges to default single blank row
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

    // when type changes -> handle mode validators + possibly load config
    this.capacityForm.get("type")?.valueChanges.subscribe((type) => {
      this.onTypeChange();

      if (type === "PAYOUT") {
        this.capacityForm.get("mode")?.reset();
        this.capacityForm.get("mode")?.disable({ emitEvent: false });
        this.capacityRanges.clear();
        this.capacityRanges.push(this.createCapacityRange());
        this.hasUptoRange = false;
        this.updateMinRanges();
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

    // when mode selected (for TOPUP) -> fetch config if website + type are set
    this.capacityForm.get("mode")?.valueChanges.subscribe((mode) => {
      const websiteId = this.capacityForm.get("websiteId")?.value;
      const type = this.capacityForm.get("type")?.value;
      if (websiteId && type === "TOPUP" && mode) {
        this.loadCapacitiesForWebsite();
      }
    });
  }

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

  private setMaxValidators(rangeGroup: FormGroup) {
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

  checkForUptoRange() {
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

  moveUptoToEnd(uptoIndex: number) {
    const rangeToMove = this.capacityRanges.at(uptoIndex);
    this.capacityRanges.removeAt(uptoIndex);
    this.capacityRanges.push(rangeToMove);
    this.updateMinRanges();
  }

  private async loadWebsites() {
    this.isLoading = true;
    try {
      let response: any;

      if (this.role?.toString().toLowerCase() === "head") {
        response = await this.headService
          .getAllHeadsWithWebsitesById(this.currentUserId)
          .toPromise();
      } else if (this.role?.toString().toLowerCase() === "branch") {
        response = await this.branchService
          .getWebsiteByBranchId(this.currentUserId)
          .toPromise();
      }

      let websitesData: Website[] = [];

      if (Array.isArray(response)) {
        websitesData = response.map((item: any) => ({
          websiteId: item.websiteId || item.id || "",
          websiteDomain: item.websiteDomain || item.domain || "",
          domain: item.domain || item.websiteDomain || "",
          currency: item.currency || "INR",
        }));
      } else if (response?.data && Array.isArray(response.data)) {
        websitesData = response.data.map((item: any) => ({
          websiteId: item.websiteId || item.id || "",
          websiteDomain: item.websiteDomain || item.domain || "",
          domain: item.domain || item.websiteDomain || "",
          currency: item.currency || "INR",
        }));
      } else if (response?.websites && Array.isArray(response.websites)) {
        websitesData = response.websites.map((item: any) => ({
          websiteId: item.websiteId || item.id || "",
          websiteDomain: item.websiteDomain || item.domain || "",
          domain: item.domain || item.websiteDomain || "",
          currency: item.currency || "INR",
        }));
      }

      this.websites = websitesData || [];
      this.filteredWebsites = [...this.websites];
    } catch (error) {
      console.error("Error loading websites:", error);
      this.errorMessage = "Failed to load websites. Please try again.";
      this.websites = [];
      this.filteredWebsites = [];
    } finally {
      this.isLoading = false;
    }
  }

  private async loadCapacitiesForWebsite() {
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
          const group = this.createCapacityRange();

          let minValue = 0;
          if (idx === 0) {
            minValue = 0;
          } else {
            const prev = capacities[idx - 1];
            const prevMaxRaw = prev?.maxRange;
            const prevMax =
              prevMaxRaw === "" || prevMaxRaw === null
                ? NaN
                : Number(prevMaxRaw);
            minValue = !isNaN(prevMax) && prevMax >= 0 ? prevMax + 1 : 0;
          }

          const isUpto = !!c.upto;

          group.patchValue(
            {
              minRange: minValue,
              maxRange: isUpto
                ? c.maxRange === 0
                  ? ""
                  : c.maxRange
                : c.maxRange || "",
              quantity: c.quantity || "",
              time: c.time || "",
              upto: isUpto,
            },
            { emitEvent: false },
          );

          if (isUpto) {
            group.get("minRange")?.disable({ emitEvent: false });
            group.get("maxRange")?.clearValidators();
            group.get("maxRange")?.setValue("", { emitEvent: false });
            group
              .get("maxRange")
              ?.updateValueAndValidity({ emitEvent: false, onlySelf: true });
          } else {
            group.get("minRange")?.enable({ emitEvent: false });
            group
              .get("maxRange")
              ?.setValidators([Validators.required, Validators.min(1)]);
            group
              .get("maxRange")
              ?.updateValueAndValidity({ emitEvent: false, onlySelf: true });
          }

          group
            .get("quantity")
            ?.updateValueAndValidity({ emitEvent: false, onlySelf: true });
          group
            .get("time")
            ?.updateValueAndValidity({ emitEvent: false, onlySelf: true });
          group.updateValueAndValidity({ emitEvent: false, onlySelf: true });

          this.capacityRanges.push(group);
        });

        this.capacityForm.updateValueAndValidity({ emitEvent: true });

        setTimeout(() => {
          this.updateMinRanges();
          this.checkForUptoRange();
          this.cdr.detectChanges();
        });
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

  addCapacityRange() {
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
        ?.setValue(lastMax ? parseInt(lastMax, 10) + 1 : 0, {
          emitEvent: false,
        });
      this.setMaxValidators(newRange);
      this.capacityRanges.push(newRange);
      this.errorMessage = "";
      this.updateMinRanges();
    } else {
      this.errorMessage =
        "Please complete the current range before adding a new one.";
    }
  }

  removeCapacityRange(index: number) {
    if (this.capacityRanges.length > 1) {
      this.capacityRanges.removeAt(index);
      this.updateMinRanges();
      this.checkForUptoRange();
    }
  }

  updateMinRanges() {
    this.capacityRanges.controls.forEach((control, index) => {
      if (index === 0) {
        control.get("minRange")?.setValue(0, { emitEvent: false });
      } else {
        const prevMaxRaw = this.capacityRanges
          .at(index - 1)
          .get("maxRange")?.value;
        const prevMax =
          prevMaxRaw === "" || prevMaxRaw === null ? NaN : Number(prevMaxRaw);
        const min = !isNaN(prevMax) && prevMax >= 0 ? prevMax + 1 : 0;
        control.get("minRange")?.setValue(min, { emitEvent: false });
      }

      if (control.get("upto")?.value) {
        control.get("minRange")?.disable({ emitEvent: false });
        control.get("maxRange")?.clearValidators();
        control.get("maxRange")?.setValue("", { emitEvent: false });
      } else {
        control.get("minRange")?.enable({ emitEvent: false });
        control
          .get("maxRange")
          ?.setValidators([Validators.required, Validators.min(1)]);
      }

      control
        .get("maxRange")
        ?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      control
        .get("quantity")
        ?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      control
        .get("time")
        ?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      (control as FormGroup).updateValueAndValidity({
        onlySelf: true,
        emitEvent: false,
      });
    });
  }

  onTypeChange() {
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

  onMaxRangeChange(index: number) {
    const currentRange = this.capacityRanges.at(index);
    const maxRange = currentRange.get("maxRange")?.value;

    if (
      index < this.capacityRanges.length - 1 &&
      !currentRange.get("upto")?.value
    ) {
      const nextRange = this.capacityRanges.at(index + 1);
      nextRange
        .get("minRange")
        ?.setValue(parseInt(maxRange, 10) + 1 || 0, { emitEvent: false });
      nextRange.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    }

    currentRange.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }

  onUptoChange(index: number) {
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

      currentRange.get("minRange")?.setValue(min, { emitEvent: false });
      currentRange.get("minRange")?.disable({ emitEvent: false });
      currentRange.get("maxRange")?.setValue("", { emitEvent: false });
      currentRange.get("maxRange")?.clearValidators();
      currentRange
        .get("maxRange")
        ?.updateValueAndValidity({ onlySelf: true, emitEvent: false });

      const idx = index;
      if (idx !== this.capacityRanges.length - 1) {
        this.moveUptoToEnd(idx);
      }

      this.hasUptoRange = true;
    } else {
      currentRange.get("minRange")?.enable({ emitEvent: false });
      if (index === 0) {
        currentRange.get("minRange")?.setValue(0, { emitEvent: false });
      } else {
        const previousMax = this.capacityRanges
          .at(index - 1)
          .get("maxRange")?.value;
        currentRange
          .get("minRange")
          ?.setValue(previousMax ? parseInt(previousMax, 10) + 1 : 0, {
            emitEvent: false,
          });
      }

      currentRange
        .get("maxRange")
        ?.setValidators([Validators.required, Validators.min(1)]);
      currentRange
        .get("maxRange")
        ?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      this.checkForUptoRange();
    }

    this.capacityRanges.controls.forEach((g) =>
      (g as FormGroup).updateValueAndValidity({
        onlySelf: true,
        emitEvent: false,
      }),
    );

    this.capacityForm.updateValueAndValidity({ emitEvent: true });
  }

  async onSubmit() {
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
    this.successMessage = "";

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
      entityType: this.role?.toUpperCase(),
      entityId: this.currentUserId,
      type: formValue.type,
      websiteId: formValue.websiteId,
      mode: formValue.type === "TOPUP" ? formValue.mode : null,
      capacities: capacities,
    };

    try {
      await this.capacityService.addCapacity(capacityData).toPromise();
      this.successMessage = "Capacity added successfully!";

      const websiteId = this.capacityForm.get("websiteId")?.value;
      const type = this.capacityForm.get("type")?.value;
      const mode = this.capacityForm.get("mode")?.value;

      this.capacityForm.reset({ emitEvent: false });
      this.capacityForm
        .get("websiteId")
        ?.setValue(websiteId, { emitEvent: false });
      this.capacityForm.get("type")?.setValue(type, { emitEvent: false });
      this.capacityForm.get("mode")?.setValue(mode, { emitEvent: false });

      this.capacityRanges.clear();
      this.capacityRanges.push(this.createCapacityRange());
      this.hasUptoRange = false;
      this.updateMinRanges();
      this.capacityForm.updateValueAndValidity({ emitEvent: true });
    } catch (error: any) {
      console.error("Error adding capacity:", error);
      this.errorMessage =
        error.error?.message || "Failed to add capacity. Please try again.";
    } finally {
      this.isSubmitting = false;
    }
  }

  // ============ WEBSITE SEARCH METHODS ============

  onWebsiteSearch(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.showWebsiteDropdown = true;

    if (this.websiteSearchTimeout) {
      clearTimeout(this.websiteSearchTimeout);
    }

    this.websiteSearchTimeout = setTimeout(() => {
      if (searchTerm.trim() === "") {
        this.filteredWebsites = [...this.websites];
      } else {
        this.filteredWebsites = this.websites.filter((website: Website) => {
          const domain = (
            website.websiteDomain ||
            website.domain ||
            ""
          ).toLowerCase();
          const id = (website.websiteId || "").toString().toLowerCase();
          const currency = (website.currency || "").toLowerCase();
          return (
            domain.includes(searchTerm) ||
            id.includes(searchTerm) ||
            currency.includes(searchTerm)
          );
        });
      }
    }, 300);
  }

  selectWebsite(website: Website) {
    this.capacityForm
      .get("websiteId")
      ?.setValue(website.websiteId, { emitEvent: true });
    this.selectedWebsiteDomain = website.websiteDomain || website.domain || "";
    this.showWebsiteDropdown = false;
    this.errorMessage = "";

    const currentType = this.capacityForm.get("type")?.value;
    if (currentType) {
      setTimeout(() => {
        this.loadCapacitiesForWebsite();
      });
    }
  }

  clearWebsiteSelection() {
    this.capacityForm.get("websiteId")?.setValue("", { emitEvent: true });
    this.selectedWebsiteDomain = "";
    this.showWebsiteDropdown = false;
    this.filteredWebsites = [...this.websites];

    const searchInput = document.querySelector(
      'input[placeholder*="Search websites"]',
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
    }

    this.errorMessage = "";

    this.capacityRanges.clear();
    this.capacityRanges.push(this.createCapacityRange());
    this.hasUptoRange = false;
    this.updateMinRanges();
  }

  onWebsiteBlur() {
    setTimeout(() => {
      this.showWebsiteDropdown = false;
    }, 200);
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // ============ 4-COLUMN LAYOUT HELPER METHODS ============

  /**
   * Get all intermediate ranges (all non-upto ranges)
   * This excludes the final/upto range completely
   */
  getIntermediateRanges(): AbstractControl[] {
    const allRanges = this.capacityRanges.controls;
    // Return only ranges that are NOT upto
    return allRanges.filter((range) => !range.get("upto")?.value);
  }

  /**
   * Get the actual form array index for an intermediate range
   * @param displayIndex The index in the filtered intermediate ranges array
   * @returns The actual index in the capacityRanges FormArray
   */
  getIntermediateRangeIndex(displayIndex: number): number {
    const allRanges = this.capacityRanges.controls;
    let foundCount = 0;

    for (let i = 0; i < allRanges.length; i++) {
      if (!allRanges[i].get("upto")?.value) {
        if (foundCount === displayIndex) {
          return i;
        }
        foundCount++;
      }
    }
    return displayIndex;
  }

  /**
   * Get the count of intermediate ranges (non-upto ranges)
   */
  getIntermediateRangesCount(): number {
    return this.getIntermediateRanges().length;
  }

  /**
   * Get the final range (the upto/infinite range)
   * Returns null if no upto range exists
   */
  getFinalRange(): AbstractControl | null {
    const allRanges = this.capacityRanges.controls;
    const uptoIndex = allRanges.findIndex((r) => r.get("upto")?.value === true);

    if (uptoIndex !== -1) {
      return allRanges[uptoIndex];
    }
    return null;
  }

  /**
   * Get the index of the final range in the form array
   * Returns -1 if no upto range exists
   */
  getFinalRangeIndex(): number {
    return this.capacityRanges.controls.findIndex(
      (r) => r.get("upto")?.value === true,
    );
  }

  /**
   * Remove the final/upto range
   */
  removeFinalRange() {
    const uptoIndex = this.getFinalRangeIndex();
    if (uptoIndex !== -1) {
      this.removeCapacityRange(uptoIndex);
    }
  }

  /**
   * Check if a specific range is the final/upto range
   * @param index The index in the form array
   */
  isFinalRange(index: number): boolean {
    return this.capacityRanges.at(index).get("upto")?.value === true;
  }

  /**
   * Get all ranges except the first range (for backward compatibility)
   */
  getAdditionalRanges(): AbstractControl[] {
    return this.capacityRanges.controls.slice(1);
  }

  /**
   * Check if there are any additional ranges beyond Range 1
   */
  hasAdditionalRanges(): boolean {
    return this.capacityRanges.length > 1;
  }

  /**
   * Get the total number of ranges
   */
  getTotalRangesCount(): number {
    return this.capacityRanges.length;
  }

  /**
   * Get the range number for display (1-based index)
   * @param index The actual form array index
   */
  getRangeNumber(index: number): number {
    return index + 1;
  }

  /**
   * Format the max range for display
   * @param range The range form group
   */
  getMaxRangeDisplay(range: AbstractControl): string {
    if (range.get("upto")?.value) {
      return "∞";
    }
    return range.get("maxRange")?.value || "—";
  }

  /**
   * Format the preview text for a range
   * @param range The range form group
   */
  getRangePreview(range: AbstractControl): string {
    const minRange = range.get("minRange")?.value || 0;
    if (range.get("upto")?.value) {
      return `${minRange} → ∞`;
    }
    const maxRange = range.get("maxRange")?.value || "—";
    return `${minRange} → ${maxRange}`;
  }

  /**
   * Format the capacity text for a range
   * @param range The range form group
   */
  getCapacityDisplay(range: AbstractControl): string {
    const quantity = range.get("quantity")?.value || 0;
    const time = range.get("time")?.value || 0;
    return `${quantity} txns / ${time} min`;
  }

  /**
   * Check if a range is valid and complete
   * @param index The form array index
   */
  isRangeValid(index: number): boolean {
    const range = this.capacityRanges.at(index);
    return range.valid;
  }

  /**
   * Get validation error message for a specific field
   * @param range The range form group
   * @param field The field name
   */
  getRangeFieldError(range: AbstractControl, field: string): string {
    const control = range.get(field);
    if (control?.errors && control.touched) {
      if (control.errors["required"]) return `${field} is required`;
      if (control.errors["min"])
        return `Min ${field === "maxRange" ? "₹1" : "1"}`;
      if (control.errors["minGreater"]) return `Must be > min range`;
    }
    return "";
  }

  /**
   * Check if any range has validation errors
   */
  hasAnyRangeErrors(): boolean {
    for (let i = 0; i < this.capacityRanges.length; i++) {
      const range = this.capacityRanges.at(i);
      if (range.invalid && range.touched) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all ranges that are not the final/upto range
   * (for use in intermediate ranges column)
   */
  getNonFinalRanges(): AbstractControl[] {
    return this.capacityRanges.controls.filter(
      (range) => !range.get("upto")?.value,
    );
  }

  /**
   * Get all ranges that are the final/upto range
   * (should only be one or none)
   */
  getFinalRanges(): AbstractControl[] {
    return this.capacityRanges.controls.filter(
      (range) => range.get("upto")?.value === true,
    );
  }

  /**
   * Move a range up in order (if not first)
   * @param index The current index
   */
  moveRangeUp(index: number) {
    if (index > 0) {
      const rangeToMove = this.capacityRanges.at(index);
      this.capacityRanges.removeAt(index);
      this.capacityRanges.insert(index - 1, rangeToMove);
      this.updateMinRanges();
      this.checkForUptoRange();
    }
  }

  /**
   * Move a range down in order (if not last)
   * @param index The current index
   */
  moveRangeDown(index: number) {
    if (index < this.capacityRanges.length - 1) {
      const rangeToMove = this.capacityRanges.at(index);
      this.capacityRanges.removeAt(index);
      this.capacityRanges.insert(index + 1, rangeToMove);
      this.updateMinRanges();
      this.checkForUptoRange();
    }
  }

  /**
   * Duplicate a range
   * @param index The index to duplicate
   */
  duplicateRange(index: number) {
    if (
      !this.hasUptoRange ||
      this.capacityRanges.at(index).get("upto")?.value
    ) {
      const sourceRange = this.capacityRanges.at(index);
      const newRange = this.createCapacityRange();

      // Copy values from source range
      newRange.patchValue(
        {
          maxRange: sourceRange.get("maxRange")?.value,
          quantity: sourceRange.get("quantity")?.value,
          time: sourceRange.get("time")?.value,
          upto: false, // Don't duplicate upto status
        },
        { emitEvent: false },
      );

      // Set minRange based on last range
      const lastRange = this.capacityRanges.at(this.capacityRanges.length - 1);
      const lastMax = lastRange.get("maxRange")?.value;
      newRange
        .get("minRange")
        ?.setValue(lastMax ? parseInt(lastMax, 10) + 1 : 0, {
          emitEvent: false,
        });

      this.setMaxValidators(newRange);
      this.capacityRanges.push(newRange);
      this.updateMinRanges();
      this.errorMessage = "";
    }
  }
}
