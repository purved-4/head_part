import { Component, OnInit } from "@angular/core";
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
export class HeadBranchCapacityComponent implements OnInit {
  capacityForm: FormGroup;
  currentUserId: any;
  role: any;
  websites: any;
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
  showWebsiteDropdown = false;
  filteredWebsites: any[] = [];
  selectedWebsiteDomain: string = "";

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
    this.loadExistingCapacities();

    // when website is selected -> enable type
    this.capacityForm.get("websiteId")?.valueChanges.subscribe((val) => {
      if (val) {
        // enable type selection
        this.capacityForm.get("type")?.enable({ emitEvent: false });
        this.errorMessage = "";

        // Update selected website domain
        const selectedWebsite = this.websites?.find(
          (w: any) => w.websiteId === val,
        );
        if (selectedWebsite) {
          this.selectedWebsiteDomain =
            selectedWebsite.websiteDomain || selectedWebsite.domain;
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
      this.onTypeChange(); // will set validators for mode

      // if type is PAYOUT -> don't need to fetch TOPUP config
      if (type === "PAYOUT") {
        // ensure mode is disabled
        this.capacityForm.get("mode")?.reset();
        this.capacityForm.get("mode")?.disable({ emitEvent: false });

        // Reset ranges to a single editable row (backend probably has separate config for PAYOUT)
        this.capacityRanges.clear();
        this.capacityRanges.push(this.createCapacityRange());
        this.hasUptoRange = false;
      } else if (type === "TOPUP") {
        // enable mode (if website already selected)
        if (this.capacityForm.get("websiteId")?.value) {
          this.capacityForm.get("mode")?.enable({ emitEvent: false });
        }
        // if mode already selected, fetch config
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

    // Make sure initial validators & state correct
    this.checkForUptoRange();
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
        maxRange: ["", [Validators.min(1)]], // required rule applied dynamically
        quantity: ["", [Validators.required, Validators.min(1)]],
        time: ["", [Validators.required, Validators.min(1)]],
        upto: [false],
      },
      {
        validators: this.rangeGroupValidator.bind(this),
      },
    );

    // Ensure max validators are set according to upto initial state
    this.setMaxValidators(group);

    // When maxRange changes we should update next range's min and revalidate group
    group.get("maxRange")?.valueChanges.subscribe(() => {
      this.updateMinRanges();
      group.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });

    // When upto toggles set/clear validators and move range if needed
    group.get("upto")?.valueChanges.subscribe(() => {
      this.setMaxValidators(group);
      group.updateValueAndValidity({ onlySelf: true });
    });

    return group;
  }

  /** Group-level validator:
   * - If upto === true -> maxRange is not required (treated separately in payload)
   * - If upto === false -> maxRange is required and must be > minRange
   */
  private rangeGroupValidator(group: AbstractControl): ValidationErrors | null {
    const g = group as FormGroup;
    const upto = !!g.get("upto")?.value;
    const minVal = Number(g.get("minRange")?.value) || 0;
    const maxControl = g.get("maxRange");
    const maxValRaw = maxControl?.value;
    const maxVal =
      maxValRaw === "" || maxValRaw === null ? NaN : Number(maxValRaw);

    // Clear previously set errors that are not relevant
    if (upto) {
      if (maxControl?.errors) {
        // remove max-related errors
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

    // Not upto -> maxRange required
    if (isNaN(maxValRaw) || maxValRaw === "" || maxValRaw === null) {
      maxControl?.setErrors({ ...(maxControl.errors || {}), required: true });
      return { maxInvalid: true };
    }

    // must be a number > minVal
    if (isNaN(maxVal) || maxVal <= minVal) {
      maxControl?.setErrors({ ...(maxControl.errors || {}), minGreater: true });
      return { maxInvalid: true };
    }

    // If passed, clear errors
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

    // If upto range exists and is not the last range, move it to the end
    const uptoIndex = ranges.findIndex(
      (range) => range.get("upto")?.value === true,
    );
    if (uptoIndex !== -1 && uptoIndex !== ranges.length - 1) {
      this.moveUptoToEnd(uptoIndex);
    }

    // ensure validators for all groups reflect upto presence
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
    // Remove at index and push the same AbstractControl to end
    this.capacityRanges.removeAt(uptoIndex);
    this.capacityRanges.push(rangeToMove);
    this.updateMinRanges();
  }

  private async loadWebsites() {
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

  private async loadExistingCapacities() {
    // Implement if you want to load existing capacities for editing
  }

  /**
   * Load capacities from backend for the selected website + entity + type + mode
   * Expects response to contain a `capacities` array of { maxRange, quantity, time, upto }
   */
  // Update the loadCapacitiesForWebsite method to handle loading states
  // Call backend for both TOPUP and PAYOUT. For non-TOPUP (e.g. PAYOUT) send mode: null.
  private async loadCapacitiesForWebsite() {
    const websiteId = this.capacityForm.get("websiteId")?.value;
    const type = this.capacityForm.get("type")?.value;
    // For TOPUP include the selected mode; for PAYOUT (or other types) send null
    const mode = type === "TOPUP" ? this.capacityForm.get("mode")?.value : null;

    // require both website and type to query
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

          // compute minRange from previous capacity's maxRange
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
            // backend may send maxRange = 0 to indicate upto -> show blank
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

        // Recalculate mins and upto flags after pushing
        this.updateMinRanges();
        this.checkForUptoRange();
      } else {
        // no capacities returned - keep a single empty row
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

  removeCapacityRange(index: number) {
    if (this.capacityRanges.length > 1) {
      this.capacityRanges.removeAt(index);
      this.updateMinRanges();
      this.checkForUptoRange();
    }
  }

  updateMinRanges() {
    this.capacityRanges.controls.forEach((control, index) => {
      // compute min based on previous maxRange
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

      // If this range is marked upto -> keep the computed min but disable the control
      if (control.get("upto")?.value) {
        control.get("minRange")?.disable({ emitEvent: false });
      } else {
        // ensure minRange is enabled for non-upto ranges
        control.get("minRange")?.enable({ emitEvent: false });
      }

      // update validity after min update
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
      // enable mode only if website is selected
      if (this.capacityForm.get("websiteId")?.value) {
        this.capacityForm.get("mode")?.enable({ emitEvent: false });
      }
    }
    this.capacityForm.get("mode")?.updateValueAndValidity();
  }

  onMaxRangeChange(index: number) {
    const currentRange = this.capacityRanges.at(index);
    const maxRange = currentRange.get("maxRange")?.value;

    // Update next range's min if exists and current range is not upto
    if (
      index < this.capacityRanges.length - 1 &&
      !currentRange.get("upto")?.value
    ) {
      const nextRange = this.capacityRanges.at(index + 1);
      nextRange.get("minRange")?.setValue(parseInt(maxRange, 10) + 1 || 0);
      (nextRange as FormGroup).updateValueAndValidity({ onlySelf: true });
    }

    // Re-validate this group
    (currentRange as FormGroup).updateValueAndValidity({ onlySelf: true });
  }

  onUptoChange(index: number) {
    const currentRange = this.capacityRanges.at(index) as FormGroup;
    const isUpto = currentRange.get("upto")?.value;

    if (isUpto) {
      // compute min from previous range (or 0 if first)
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

      // For upto range: set min to computed value and disable it
      currentRange.get("minRange")?.setValue(min);
      currentRange.get("minRange")?.disable({ emitEvent: false });

      // maxRange is not required for UI; keep blank for clarity
      currentRange.get("maxRange")?.setValue("");
      this.setMaxValidators(currentRange);
      currentRange.get("maxRange")?.updateValueAndValidity({ onlySelf: true });

      // Move this range to the end if it's not already
      const idx = index;
      if (idx !== this.capacityRanges.length - 1) {
        this.moveUptoToEnd(idx);
      }

      // Disable adding new ranges
      this.hasUptoRange = true;
    } else {
      // Not upto, enable minRange and set appropriate value
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

      // Restore validators for maxRange
      this.setMaxValidators(currentRange);
      currentRange.get("maxRange")?.updateValueAndValidity({ onlySelf: true });

      // Check if any other range has upto
      this.checkForUptoRange();
    }

    // update validity for all ranges after change
    this.capacityRanges.controls.forEach((g) =>
      (g as FormGroup).updateValueAndValidity({
        onlySelf: true,
        emitEvent: false,
      }),
    );
  }

  async onSubmit() {
    if (this.capacityForm.invalid) {
      this.markFormGroupTouched(this.capacityForm);
      this.errorMessage = "Please fill all required fields correctly.";
      return;
    }

    // Check if there's at least one upto range
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

    // Prepare capacities array: only send maxRange, quantity, time, upto
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
      // Use same addCapacity API for creating/updating per your instruction
      const response = await this.capacityService
        .addCapacity(capacityData)
        .toPromise();
      this.successMessage = "Capacity added successfully!";

      // Reset form to initial state but keep website selected so user can continue
      const websiteId = this.capacityForm.get("websiteId")?.value;
      const type = this.capacityForm.get("type")?.value;
      const mode = this.capacityForm.get("mode")?.value;

      this.capacityForm.reset();
      this.capacityForm.get("websiteId")?.setValue(websiteId);
      this.capacityForm.get("type")?.setValue(type);
      this.capacityForm.get("mode")?.setValue(mode);

      // keep ranges as a fresh single row
      this.capacityRanges.clear();
      this.capacityRanges.push(this.createCapacityRange());
      this.hasUptoRange = false;
    } catch (error: any) {
      console.error("Error adding capacity:", error);
      this.errorMessage =
        error.error?.message || "Failed to add capacity. Please try again.";
    } finally {
      this.isSubmitting = false;
    }
  }

  onWebsiteSearch(event: any) {
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

  selectWebsite(website: any) {
    this.capacityForm.get("websiteId")?.setValue(website.websiteId);
    this.selectedWebsiteDomain = website.websiteDomain || website.domain;
    this.showWebsiteDropdown = false;

    // Trigger the type change to load capacities
    const currentType = this.capacityForm.get("type")?.value;
    if (currentType) {
      this.loadCapacitiesForWebsite();
    }
  }

  onWebsiteBlur() {
    // Delay hiding dropdown to allow click selection
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
}
