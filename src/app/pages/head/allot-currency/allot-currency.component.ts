import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, FormArray } from "@angular/forms";
import { SnackbarService } from "../../../common/snackbar/snackbar.service";
import { log } from "console";
import { PortalService } from "../../services/portal.service";

@Component({
  selector: "app-allot-currency",
  templateUrl: "./allot-currency.component.html",
})
export class AllotCurrencyComponent implements OnInit {
@Input() entityId: any;
@Input() entityRole: any;
  @Output() close = new EventEmitter<void>();

  form: FormGroup;
  isEditMode: boolean = false;
  headerCurrencyData: any = null;

  constructor(
    private fb: FormBuilder,
    private snackBar: SnackbarService,
    private portalService: PortalService,
  ) {
    this.form = this.fb.group({
      currencies: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadCurrencies();
  }

  get currencies(): FormArray {
    return this.form.get("currencies") as FormArray;
  }

  // ================= LOAD =================
  loadCurrencies() {
this.portalService
  .getCurrenciesByEntity(this.entityId, this.entityRole)
  .subscribe({
    next: (res: any) => {
      const data = Array.isArray(res) ? res : res?.data || [];
      this.prepareCurrencies(data);
    },
    error: () => this.prepareCurrencies([]),
  });
  }

  // ================= CORE =================
  prepareCurrencies(portalData: any[]) {
    this.currencies.clear();

    const defaultCurrencies = [
      { currency: "INR", allowedModes: ["BANK", "UPI"] },
      { currency: "USD", allowedModes: ["QR"] },
    ];

    defaultCurrencies.forEach((cur) => {
      const match = portalData.find((c: any) => c.currency === cur.currency);

      this.currencies.push(
        this.fb.group({
          currency: [cur.currency],
          selected: [false],
          amount: [match ? match.rate : ""],
          modes: [match ? this.convertModes(match.modes) : []],
          allowedModes: [cur.allowedModes],
        }),
      );
    });

    this.setHeaderData();
  }

  convertModes(modesObj: any): string[] {
    if (!modesObj) return [];
    return Object.keys(modesObj).filter((k) => modesObj[k]);
  }

  // ================= UI =================
  selectCurrency(index: number) {
    this.currencies.controls.forEach((ctrl, i) => {
      ctrl.patchValue({ selected: i === index });
    });

    this.setHeaderData();
  }

  isChecked(mode: string, index: number): boolean {
    return this.currencies.at(index).value.modes?.includes(mode);
  }

  onModeChange(event: any, index: number) {
    const mode = event.target.value;
    let modes = this.currencies.at(index).value.modes || [];

    if (event.target.checked) {
      if (!modes.includes(mode)) modes.push(mode);
    } else {
      modes = modes.filter((m: string) => m !== mode);
    }

    this.currencies.at(index).patchValue({ modes });
  }

  onSingleModeChange(mode: string, index: number) {
    this.currencies.at(index).patchValue({ modes: [mode] });
  }

  enableEdit() {
    this.isEditMode = true;
  }

  cancelEdit() {
    this.isEditMode = false;
    this.loadCurrencies();
  }

  closeModal() {
    this.close.emit();
  }

  // ================= HEADER =================
  setHeaderData() {
    const selected = this.currencies.value.find((c: any) => c.selected);

    this.headerCurrencyData = selected
      ? {
          currency: selected.currency,
          rate: selected.amount,
        }
      : null;
  }

  
}