
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
  fttPercentage: number;
  payinPercentage: number;
  payoutPercentage: number;
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
  newCompartEntries: NewCompartEntry[] = [];
  // NEW: to show/hide parent comparts view
  showParentCompartsView = false;

  constructor(
    private compartService: ComPartService,
    private fb: FormBuilder,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.currentEntityType = this.userStateService.getRole();
    this.buildForm();

    if (this.data) {
      this.entityData = this.data;

      this.patchEntityForm();
    }

    this.loadAllData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editForm) {
      this.buildForm();
    }

    if (changes["data"] && this.data) {
      this.entityData = this.data;

      this.editForm.patchValue({
        username: this.entityData.username ?? "",
        info: this.entityData.info ?? "",
        parentCurrency: this.entityData.parentCurrency ?? "",
      });
    }
    this.newCompartEntries = [];
    this.allocatedPercentages = [];
    this.availableComparts = [];
    this.loadAllData();
  }

  buildForm(): void {
    this.editForm = this.fb.group({
      username: ["", Validators.required],
      info: [""],
      parentCurrency: [""],

      // 🔴 REQUIRED (missing in your code)
      compartId: [""],

      payinPercentage: [0, [Validators.min(0)]],
      fttPercentage: [0, [Validators.min(0)]],
      payoutPercentage: [0, [Validators.min(0)]],
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

  loadAllData(): void {
    this.loadingComparts = true;
    this.loadingPercentages = true;

    const parent$ =
      // this.entityType === "OWNER"
      //   ? this.compartService.getAllComPartByOwner(this.entityId).pipe(
      //       catchError((err) => {

      //         return of(null);
      //       }),
      //     )
      //   :
      this.compartService
        .getPercentageByEntityId(this.entityId, this.entityType)
        .pipe(
          catchError((err) => {
            return of(null);
          }),
        );

    const child$ = this.data?.id
      ? this.compartService
          .getPercentageByEntityId(this.data.id, this.getEntityLabel(this.data))
          .pipe(
            catchError((err) => {
              return of(null);
            }),
          )
      : of(null);

    forkJoin({
      parent: parent$,
      child: child$,
    }).subscribe({
      next: ({ parent, child }) => {
        this.parentData = parent ?? [];
        this.parentComparts = parent ?? [];

        this.allocatedPercentages = this.extractChildRows(child);

        this.refreshAvailableComparts();

        if (
          !this.editForm.get("compartId")?.value &&
          this.availableComparts.length > 0
        ) {
          this.editForm.patchValue({
            compartId: this.getCompartId(this.availableComparts[0]),
          });
        }

        this.loadingComparts = false;
        this.loadingPercentages = false;
      },
      error: (err) => {
        this.loadingComparts = false;
        this.loadingPercentages = false;
      },
    });
  }

  extractChildRows(res: any): CompartPercentageRow[] {
    const raw = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
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

  refreshAvailableComparts(): void {
    const allocatedIds = new Set(
      this.allocatedPercentages.map((x) => x.compartId),
    );

    this.availableComparts = (this.parentComparts ?? []).filter(
      (item: any) => !allocatedIds.has(this.getCompartId(item)),
    );
  }

  // NEW: Get the percentage for a specific compart from allocated percentages
  getCompartPercentage(compartId: string): CompartPercentageRow | undefined {
    return this.allocatedPercentages.find((x) => x.compartId === compartId);
  }

  // NEW: Toggle parent comparts visibility
  toggleParentCompartsView(): void {
    this.showParentCompartsView = !this.showParentCompartsView;
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
        return data?.businessType === "B2C" ? "BRANCH" : "MANAGER";
      case "MANAGER":
        return "HEAD";
      case "HEAD":
        return "BRANCH";
      default:
        return "Entity";
    }
  }

  getCompartId(item: any): string {
    return item?.id || item?.compartId || item?._id || "-";
  }

  getCompartName(item: any): string {
    return (
      item?.comPartType ||
      item?.username ||
      item?.title ||
      item?.compartUsername ||
      "Unnamed"
    );
  }

  isEnabled(item: any): boolean {
    return !!item?.enabled;
  }

  getSelectedCompartName(): string {
    const selectedId = this.editForm?.get("compartId")?.value;
    if (!selectedId) return "-";

    const found = this.availableComparts.find(
      (c: any) =>
        c?.id === selectedId ||
        c?.compartId === selectedId ||
        c?._id === selectedId,
    );

    return found ? this.getCompartName(found) : "-";
  }

  // UPDATED: existing allotted compartment ko edit karne ke liye
  onAllocatedPercentageChange(
    compartId: string,
    field: "payinPercentage" | "payoutPercentage" | "fttPercentage",
    value: any,
  ): void {
    const idx = this.allocatedPercentages.findIndex(
      (x) => x.compartId === compartId,
    );

    if (idx === -1) return;

    this.allocatedPercentages[idx] = {
      ...this.allocatedPercentages[idx],
      [field]: Number(value ?? 0),
    };
  }

  private buildCompartPercentagesPayload(): any {
    const payload: any = {};

    // already allocated rows — editable, not removable
    for (const item of this.allocatedPercentages || []) {
      const id = item?.compartId;
      if (!id) continue;

      payload[id] = {
        payinPercentage: Number(item?.payinPercentage ?? 0),
        payoutPercentage: Number(item?.payoutPercentage ?? 0),
        fttPercentage: Number(item?.fttPercentage ?? 0),
      };
    }

    // newly added compart from form

    for (const entry of this.newCompartEntries) {
      if (!entry.compartId) continue;
      payload[entry.compartId] = {
        payinPercentage: entry.payinPercentage,
        payoutPercentage: entry.payoutPercentage,
        fttPercentage: entry.fttPercentage,
      };
    }

    return payload;
  }

  onSubmit(): void {
    let payload: any = {
      id: this.data?.id ?? this.entityId,
      username: this.editForm.value.username,
      info: this.editForm.value.info,
      parentCurrency: this.editForm.value.parentCurrency,
      active: !!(this.entityData?.active ?? this.data?.active),
      compartPercentages: this.buildCompartPercentagesPayload(),

      businessType: this.entityData?.businessType,
      createdById: this.entityData?.createdById,
      createdByType: this.entityData?.createdByType,
    };

    if (this.entityType === "CHIEF") {
      payload.chiefId = this.entityData?.chiefId;
    }

    if (this.entityType === "MANAGER") {
      payload.managerId = this.entityData?.managerId;
    }

    this.save.emit(payload);
    this.save.emit(payload);
    this.newCompartEntries = []; // YE ADD KARO
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByCompartId(index: number, item: any): string {
    return this.getCompartId(item);
  }
  openParentModal() {
    this.showParentModal = true;

    // const child$ = this.data?.id
    //   ? this.compartService.getPercentageByEntityId(
    //       this.data.id,
    //       this.getEntityLabel(this.data),
    //     )
    //   : of(null);

    // child$.subscribe({
    //   next: (res: any) => {

    //     //  mapping bhi same use kar
    //     this.parentData = this.extractChildRows(res);
    //   },
    //   error: () => {
    //     this.parentData = [];
    //     this.showParentModal = false;
    //   },
    // });
  }
  closeParentModal() {
    this.showParentModal = false;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
  addCompartEntry(): void {


    const compartId = String(
      this.editForm.get("compartId")?.value ?? "",
    ).trim();



    if (!compartId) return;

    const alreadyAdded = this.newCompartEntries.some(
      (e) => String(e.compartId) === compartId,
    );

    const alreadyAllocated = this.allocatedPercentages.some(
      (e) => String(e.compartId) === compartId,
    );

    if (alreadyAdded || alreadyAllocated) return;

    const found = this.parentComparts.find(
      (c) => String(this.getCompartId(c)) === compartId,
    );

    this.newCompartEntries = [
      ...this.newCompartEntries,
      {
        compartId,
        compartUsername: found ? this.getCompartName(found) : compartId,
        fttPercentage: Number(this.editForm.get("fttPercentage")?.value ?? 0),
        payinPercentage: Number(
          this.editForm.get("payinPercentage")?.value ?? 0,
        ),
        payoutPercentage: Number(
          this.editForm.get("payoutPercentage")?.value ?? 0,
        ),
      },
    ];

    // reset form safely
    this.editForm.patchValue({
      compartId: "",
      fttPercentage: 0,
      payinPercentage: 0,
      payoutPercentage: 0,
    });
  }

  removeNewEntry(compartId: string): void {
    compartId = String(compartId);

    this.newCompartEntries = this.newCompartEntries.filter(
      (e) => String(e.compartId) !== compartId,
    );

    const restored = this.parentComparts.find(
      (c) => String(this.getCompartId(c)) === compartId,
    );

    if (restored) {
      const exists = this.availableComparts.some(
        (c) => String(this.getCompartId(c)) === compartId,
      );

      if (!exists) {
        this.availableComparts = [...this.availableComparts, restored];
      }
    }
  }

  onNewEntryChange(
    compartId: string,
    field: "fttPercentage" | "payinPercentage" | "payoutPercentage",
    value: any,
  ): void {
    compartId = String(compartId);

    this.newCompartEntries = this.newCompartEntries.map((entry) =>
      String(entry.compartId) === compartId
        ? { ...entry, [field]: Number(value ?? 0) }
        : entry,
    );
  }
}
