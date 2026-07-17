import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { ComPartService } from "../../pages/services/com-part.service";
import { UserStateService } from "../../store/user-state.service";

interface CompartPercentageRow {
  compartId: string;
  compartUsername?: string;
  payinPercentage: number;
  payoutPercentage: number;
  fttPercentage: number;
  [key: string]: any;
}

interface NewCompartEntry {
  compartId: string;
  compartUsername?: string;
}

interface MinPercentage {
  payinPercentage: number;
  payoutPercentage: number;
  fttPercentage: number;
}

@Component({
  selector: "app-enity-compart-edit-model",
  templateUrl: "./enity-compart-edit-model.component.html",
  styleUrl: "./enity-compart-edit-model.component.css",
})
export class EnityCompartEditModelComponent implements OnInit, OnChanges {
  @Input() entityId: any;
  @Input() entityType: any;
  @Input() data: any = null;
  @Input() showModal = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  editForm!: FormGroup;

  loadingComparts = false;
  loadingPercentages = false;

  showParentModal = false;
  parentData: any[] = [];
  entityData: any = null;

  parentComparts: any[] = [];
  availableComparts: any[] = [];
  allocatedPercentages: CompartPercentageRow[] = [];
  currentEntityType: any;

  // multi-select "add new compart" ke liye
  newCompartEntries: NewCompartEntry[] = [];
  sharedPercentage = {
    payinPercentage: 0,
    payoutPercentage: 0,
    fttPercentage: 0,
  };

  // minPercentage jo child API se aata hai — YEH hi cheez edit hoti hai
  // (individual compart ka percentage edit nahi hota, sirf yeh minimum floor)
  minPercentage: MinPercentage | null = null;
  parentMinPercentage: MinPercentage | null = null;

  // Edit button dabane par true hota hai, tab hi inputs enable hote hain
  isEditingMinPercentage = false;
  minPercentageDraft: MinPercentage = {
    payinPercentage: 0,
    payoutPercentage: 0,
    fttPercentage: 0,
  };

  showParentCompartsView = false;

  private hasLoadedOnce = false;

  constructor(
    private compartService: ComPartService,
    private fb: FormBuilder,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.currentEntityType = this.userStateService.getRole();

    if (!this.editForm) {
      this.buildForm();
    }

    if (this.data) {
      this.entityData = this.data;
      this.patchEntityForm();
    }

    if (!this.hasLoadedOnce && this.entityId) {
      this.loadAllData();
      this.hasLoadedOnce = true;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editForm) {
      this.buildForm();
    }

    if (changes["data"] && this.data) {
      this.entityData = this.data;
      this.patchEntityForm();
    }

    const isFirstDataChange =
      changes["data"]?.firstChange ||
      changes["entityId"]?.firstChange ||
      changes["entityType"]?.firstChange;

    const isSubsequentRealChange =
      !isFirstDataChange &&
      (changes["data"] || changes["entityId"] || changes["entityType"]);

    if (isFirstDataChange && this.entityId && !this.hasLoadedOnce) {
      this.newCompartEntries = [];
      this.allocatedPercentages = [];
      this.availableComparts = [];
      this.resetSharedPercentage();
      this.loadAllData();
      this.hasLoadedOnce = true;
      return;
    }

    if (isSubsequentRealChange) {
      this.newCompartEntries = [];
      this.allocatedPercentages = [];
      this.availableComparts = [];
      this.resetSharedPercentage();
      this.loadAllData();
    }
  }

  buildForm(): void {
    this.editForm = this.fb.group({
      username: ["", Validators.required],
      info: [""],
      parentCurrency: [""],
    });
  }

  patchEntityForm(): void {
    if (!this.editForm || !this.entityData) return;

    this.editForm.patchValue({
      username: this.entityData.username ?? "",
      info: this.entityData.info ?? "",
      parentCurrency: this.entityData.parentCurrency || "",
    });
  }

  resetSharedPercentage(): void {
    this.sharedPercentage = {
      payinPercentage: 0,
      payoutPercentage: 0,
      fttPercentage: 0,
    };
  }

  get canAddNewCompart(): boolean {
    return this.currentEntityType === "OWNER";
  }

  loadAllData(): void {
    if (!this.entityId) return;

    this.loadingComparts = true;
    this.loadingPercentages = true;

    const parent$ = this.compartService
      .getPercentageByEntityId(this.entityId, this.entityType)
      .pipe(catchError(() => of(null)));

    const child$ = this.data?.id
      ? this.compartService
          .getPercentageByEntityId(this.data.id, this.getEntityLabel(this.data))
          .pipe(catchError(() => of(null)))
      : of(null);

    forkJoin({
      parent: parent$,
      child: child$,
    }).subscribe({
      next: ({ parent, child }) => {
        this.parentComparts = this.extractRows(parent);
        this.parentData = this.parentComparts;
        this.parentMinPercentage = this.extractMinPercentage(parent);

        this.allocatedPercentages = this.extractRows(child);
        this.minPercentage = this.extractMinPercentage(child);
        this.isEditingMinPercentage = false;

        this.refreshAvailableComparts();

        this.loadingComparts = false;
        this.loadingPercentages = false;
      },
      error: () => {
        this.loadingComparts = false;
        this.loadingPercentages = false;
      },
    });
  }

  extractRows(res: any): CompartPercentageRow[] {
    const raw = Array.isArray(res?.data?.list)
      ? res.data.list
      : Array.isArray(res?.list)
        ? res.list
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

    return raw
      .map((item: any) => ({
        compartId: item?.compartId ?? item?.id ?? item?._id ?? "",
        compartUsername: item?.compartUsername ?? item?.username ?? "-",
        payinPercentage: Number(item?.payinPercentage ?? 0),
        payoutPercentage: Number(item?.payoutPercentage ?? 0),
        fttPercentage: Number(item?.fttPercentage ?? 0),
        ...item,
      }))
      .filter((item: CompartPercentageRow) => !!item.compartId);
  }

  extractMinPercentage(res: any): MinPercentage | null {
    const min = res?.data?.minPercentage ?? res?.minPercentage ?? null;
    if (!min) return null;

    return {
      payinPercentage: Number(min?.payinPercentage ?? 0),
      payoutPercentage: Number(min?.payoutPercentage ?? 0),
      fttPercentage: Number(min?.fttPercentage ?? 0),
    };
  }

  refreshAvailableComparts(): void {
    const allocatedIds = new Set(
      this.allocatedPercentages.map((x) => x.compartId),
    );

    this.availableComparts = (this.parentComparts ?? []).filter(
      (item: any) => !allocatedIds.has(this.getCompartId(item)),
    );
  }

  closeModal(): void {
    this.showModal = false;
    this.close.emit();
  }

  getEntityLabel(data: any): string {
    switch (this.entityType) {
      case "OWNER":
        return "CHIEF";
      case "CHIEF":
        return data?.businessType === "B2C" ? "HEAD" : "MANAGER";
      case "MANAGER":
        return "HEAD";
      case "HEAD":
        return "BRANCH";
      default:
        return "Entity";
    }
  }

  getCompartId(item: any): string {
    return item?.compartId || item?.id || item?._id || "-";
  }

  getCompartName(item: any): string {
    return (
      item?.compartUsername ||
      item?.comPartType ||
      item?.username ||
      item?.title ||
      "Unnamed"
    );
  }

  enableMinPercentageEdit(): void {
    this.minPercentageDraft = {
      payinPercentage: this.minPercentage?.payinPercentage ?? 0,
      payoutPercentage: this.minPercentage?.payoutPercentage ?? 0,
      fttPercentage: this.minPercentage?.fttPercentage ?? 0,
    };
    this.isEditingMinPercentage = true;
  }

  cancelMinPercentageEdit(): void {
    this.isEditingMinPercentage = false;
  }

  onMinPercentageDraftChange(
    field: "payinPercentage" | "payoutPercentage" | "fttPercentage",
    value: any,
  ): void {
    this.minPercentageDraft = {
      ...this.minPercentageDraft,
      [field]: Number(value ?? 0),
    };
  }

  saveMinPercentageEdit(): void {
    this.minPercentage = { ...this.minPercentageDraft };
    this.isEditingMinPercentage = false;
  }

  private buildMinPercentagePayload(): MinPercentage | null {
    if (!this.minPercentage) return null;

    return {
      payinPercentage: Number(this.minPercentage.payinPercentage ?? 0),
      payoutPercentage: Number(this.minPercentage.payoutPercentage ?? 0),
      fttPercentage: Number(this.minPercentage.fttPercentage ?? 0),
    };
  }

  isCompartSelected(compartId: string): boolean {
    return this.newCompartEntries.some((e) => e.compartId === compartId);
  }

  toggleCompartSelection(item: any): void {
    if (!this.canAddNewCompart) return;

    const compartId = this.getCompartId(item);
    const idx = this.newCompartEntries.findIndex(
      (e) => e.compartId === compartId,
    );

    if (idx > -1) {
      this.newCompartEntries = this.newCompartEntries.filter(
        (e) => e.compartId !== compartId,
      );
    } else {
      this.newCompartEntries = [
        ...this.newCompartEntries,
        {
          compartId,
          compartUsername: this.getCompartName(item),
        },
      ];
    }
  }

  removeNewEntry(compartId: string): void {
    this.newCompartEntries = this.newCompartEntries.filter(
      (e) => e.compartId !== compartId,
    );
  }

  private buildNewCompartAllocation(): {
    compartIds: string[];
    percentage: any;
  } | null {
    if (!this.canAddNewCompart) return null;
    if (!this.newCompartEntries.length) return null;

    return {
      compartIds: this.newCompartEntries.map((e) => e.compartId),
      percentage: {
        payinPercentage: Number(this.sharedPercentage.payinPercentage ?? 0),
        payoutPercentage: Number(this.sharedPercentage.payoutPercentage ?? 0),
        fttPercentage: Number(this.sharedPercentage.fttPercentage ?? 0),
      },
    };
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByCompartId(index: number, item: { compartId: string }): string {
    return item.compartId;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // ---------- Submit ----------
  onSubmit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    if (this.isEditingMinPercentage) {
      this.minPercentage = { ...this.minPercentageDraft };
      this.isEditingMinPercentage = false;
    }

    const payload: any = {
      id: this.data?.id ?? this.entityId,
      username: this.editForm.value.username,
      info: this.editForm.value.info,
      parentCurrency: this.editForm.value.parentCurrency,
      active: !!(this.entityData?.active ?? this.data?.active),
      percentage: this.buildMinPercentagePayload(),

      businessType: this.entityData?.businessType,
      createdById: this.entityData?.createdById,
      createdByType: this.entityData?.createdByType,
    };

    const newAllocation = this.buildNewCompartAllocation();
    if (newAllocation) {
      payload.compartIds = newAllocation.compartIds;
      payload.percentage = newAllocation.percentage;
    }

    if (this.entityType === "CHIEF") {
      payload.chiefId = this.entityData?.chiefId;
    }

    if (this.entityType === "MANAGER") {
      payload.managerId = this.entityData?.managerId;
    }

    this.save.emit(payload);

    this.newCompartEntries = [];
    this.resetSharedPercentage();
  }

  // ---------- Parent modal ----------
  openParentModal() {
    this.showParentModal = true;
  }

  closeParentModal() {
    this.showParentModal = false;
  }
}
