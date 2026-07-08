import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";
import { Subscription } from "rxjs";
import { UserStateService } from "../../../store/user-state.service";
import { CryptoService } from "../../../pages/services/crypto.service";

@Component({
  selector: "app-add-bep20",
  templateUrl: "./add-bep20.component.html",
  styleUrl: "./add-bep20.component.css",
})
export class AddBep20Component implements OnInit, OnDestroy {
  @Input() currency: any = null;
  @Input() embeddedMode = false;

  @Output() formSubmitted = new EventEmitter<any>();
  @Output() formCancelled = new EventEmitter<void>();

  readonly networkLabel = "BEP-20";

  walletAddress = "";
  accountHolderName = "";
  walletLimit: number | null = null;
  acceptsPpi = false;
  isSubmitting = false;
  selectedCurrency: any = null;
  selectedMode: any;
  showForm: any;
  modes: any;

  // ---- QR ----
  qrData: string = "";
  generatedFile: File | null = null;
  isGeneratingQr = false;

  entityId: any;
  entityType: any;

  private subs = new Subscription();
  capacityRanges: {
    minRange: any | null;
    maxRange: any | null;
    quantity: any | null;
  }[] = [{ minRange: null, maxRange: null, quantity: null }];

  constructor(
    private snackBar: SnackbarService,
    private crypto: CryptoService,
    private currencyBehaviour: CurrencyBehaviourService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.entityType = this.userStateService.getRole();
    this.subs.add(
      this.currencyBehaviour.getCurrency().subscribe((res) => {
        this.selectedCurrency = res;
      }),
    );

    this.subs.add(
      this.currencyBehaviour.getMode().subscribe((res) => {
        console.log("Received Mode:", res);
        this.selectedMode = res;
      }),
    );
  }
  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  addRange(): void {
    const last = this.capacityRanges[this.capacityRanges.length - 1];

    if (
      last.minRange == null ||
      last.maxRange == null ||
      last.quantity == null
    ) {
      this.snackBar.show("Please fill all range fields first.", false);
      return;
    }

    if (last.minRange <= 0 || last.maxRange <= 0 || last.quantity <= 0) {
      this.snackBar.show("Range values must be greater than 0.", false);
      return;
    }

    if (last.maxRange <= last.minRange) {
      this.snackBar.show("'To' must be greater than 'From'.", false);
      return;
    }

    this.capacityRanges.push({
      minRange: null,
      maxRange: null,
      quantity: null,
    });
  }

  removeRange(index: number): void {
    this.capacityRanges.splice(index, 1);

    if (this.capacityRanges.length === 0) {
      this.capacityRanges = [
        { minRange: null, maxRange: null, quantity: null },
      ];
    }
  }

  onCancel(): void {
    this.formCancelled.emit();
  }

  onSubmit(): void {
    if (!this.walletAddress.trim()) {
      this.snackBar.show("Wallet address is required.", false);
      return;
    }

    if (!this.generatedFile) {
      this.snackBar.show("Please generate QR first.", false);
      return;
    }

    const validRanges = this.capacityRanges
      .filter(
        (r) =>
          r.minRange != null &&
          r.maxRange != null &&
          r.quantity != null &&
          r.minRange > 0 &&
          r.maxRange > 0 &&
          r.quantity > 0 &&
          r.maxRange > r.minRange,
      )
      .map((r) => ({
        minRange: r.minRange!,
        maxRange: r.maxRange!,
        quantity: r.quantity!,
      }));

    const payload: any = {
      entityId: this.entityId,
      entityType: this.entityType,
      paymentMethod: this.selectedMode,
      currency: this.selectedCurrency?.currency,
      network: this.selectedMode,
      walletAddress: this.walletAddress,
      holderName: this.accountHolderName,
      limitAmount: this.walletLimit,
      fttAcceptance: this.acceptsPpi,
      ranges: validRanges.length ? validRanges : null,
    };

    const formData = new FormData();

    formData.append(
      "dto",
      new Blob([JSON.stringify(payload)], {
        type: "application/json",
      }),
    );

    formData.append("file", this.generatedFile, this.generatedFile.name);

    this.isSubmitting = true;
    this.crypto.addCrypto(formData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.snackBar.show(res.message || "BEP-20 added successfully", true);
        this.formSubmitted.emit();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.snackBar.show(err?.error?.message || "Error adding BEP-20", false);
      },
    });
  }

  selectCurrency(currency: any): void {
    this.selectedCurrency = currency;
    this.currencyBehaviour.setCurrency(currency);
    this.modes = Object.keys(currency?.modes || {}).filter(
      (key) => currency.modes[key] === true,
    );
    this.selectedMode = null;
    this.showForm = false;
  }

  selectMode(mode: any): void {
    this.selectedMode = mode?.toUpperCase();
    this.currencyBehaviour.setMode(this.selectedMode);
    this.showForm = !!mode;
  }

  //TEMP
  generateWalletAddress(): void {
    switch ((this.networkLabel || "").toUpperCase()) {
      case "BEP-20":
        this.walletAddress = this.generateERC20Address();
        break;
      default:
        this.walletAddress = "";
    }
    // address change hote hi purana QR clear kar do
    this.qrData = "";
    this.generatedFile = null;
  }

  private randomString(chars: string, length: number): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateERC20Address(): string {
    const hex = "0123456789abcdef";
    return "0x" + this.randomString(hex, 40);
  }

  // ---------------- QR (UPI wale component jaisa hi pattern) ----------------
  generateQrCode(): void {
    const address = this.walletAddress.trim();

    if (!address) {
      this.snackBar.show(
        "Please enter or generate a wallet address first.",
        false,
      );
      return;
    }

    this.isGeneratingQr = true;
    this.qrData = address;

    const filename = `qr_${this.networkLabel}_${Date.now()}.png`;

    // qrcode component ko render hone ka time do
    setTimeout(() => {
      const canvas = document.querySelector(
        "qrcode canvas",
      ) as HTMLCanvasElement;

      if (!canvas) {
        this.snackBar.show("QR not rendered yet", false);
        this.isGeneratingQr = false;
        return;
      }

      canvas.toBlob((blob) => {
        if (blob) {
          this.generatedFile = new File([blob], filename, {
            type: "image/png",
          });
          this.snackBar.show("QR generated successfully", true);
        } else {
          this.snackBar.show("Failed to generate QR", false);
        }
        this.isGeneratingQr = false;
      }, "image/png");
    }, 300);
  }

  removeQrCode(): void {
    this.qrData = "";
    this.generatedFile = null;
  }
}
