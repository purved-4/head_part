import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { CryptoService } from "../../../pages/services/crypto.service";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";
import { Subscription } from "rxjs";
import { UserStateService } from "../../../store/user-state.service";
import { tr } from "intl-tel-input/i18n";

type CryptoNetwork = "OMNI" | "SPL" | "ERC20" | "TRC20" | "BEP20";

interface CapacityRangeRow {
  minRange: number | null;
  maxRange: number | null;
  quantity: number | null;
}

const NETWORK_META: Record<
  CryptoNetwork,
  { label: string; symbol: string; colorClass: string }
> = {
  ERC20: { label: "ERC-20", symbol: "◆", colorClass: "text-gray-500" },
  BEP20: { label: "BEP-20", symbol: "◈", colorClass: "text-yellow-500" },
  TRC20: { label: "TRC-20", symbol: "▽", colorClass: "text-red-500" },
  OMNI: { label: "OMNI", symbol: "₮", colorClass: "text-green-600" },
  SPL: { label: "SPL", symbol: "₮", colorClass: "text-green-600" },
};

@Component({
  selector: "app-add-crypto",
  templateUrl: "./add-crypto.component.html",
  styleUrl: "./add-crypto.component.css",
})
export class AddCryptoComponent implements OnInit, OnChanges, OnDestroy {
  @Input() currency: any = null;
  /** OMNI | SPL | ERC20 | TRC20 | BEP20 — comes from InventoryConfigurationComponent's selectedMode */
  @Input() mode: string | null = null;
  @Input() embeddedMode = false;

  @Output() formSubmitted = new EventEmitter<any>();
  @Output() formCancelled = new EventEmitter<void>();

  networkLabel = "";
  private networkKey: CryptoNetwork = "ERC20";
  qrSourceMode: "generate" | "upload" = "generate"; // default to generate QR
  walletAddress = "";
  accountHolderName = "";
  walletLimit: number | null = null;
  acceptsPpi = true;
  isSubmitting = false;

  selectedCurrency: any = null;
  selectedMode: any;

  // ---- QR (generate or manual upload) ----
  qrData = "";
  generatedFile: File | null = null;
  isGeneratingQr = false;
  uploadedPreviewUrl: string | null = null;
  uploadError = "";

  entityId: any;
  entityType: any;

  private subs = new Subscription();

  capacityRanges: CapacityRangeRow[] = [
    { minRange: null, maxRange: null, quantity: null },
  ];

  constructor(
    private snackBar: SnackbarService,
    private crypto: CryptoService,
    private currencyBehaviour: CurrencyBehaviourService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.entityType = this.userStateService.getRole();

    this.applyNetwork(this.mode);

    this.subs.add(
      this.currencyBehaviour.getCurrency().subscribe((res) => {
        this.selectedCurrency = res;
      }),
    );

    this.subs.add(
      this.currencyBehaviour.getMode().subscribe((res) => {
        this.selectedMode = res;
        // keep in sync in case parent updates the behaviour service directly
        this.applyNetwork(res);
      }),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["mode"] && !changes["mode"].firstChange) {
      this.applyNetwork(this.mode);
      this.resetWalletAndQr();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.revokePreviewUrl();
  }

  private applyNetwork(rawMode: string | null | undefined): void {
    const key = (rawMode || "ERC20").toUpperCase() as CryptoNetwork;
    this.networkKey = NETWORK_META[key] ? key : "ERC20";
    this.networkLabel = NETWORK_META[this.networkKey].label;
  }

  get networkSymbol(): string {
    return NETWORK_META[this.networkKey].symbol;
  }

  get networkColorClass(): string {
    return NETWORK_META[this.networkKey].colorClass;
  }

  private resetWalletAndQr(): void {
    this.walletAddress = "";
    this.clearQr();
  }

  // ─── Capacity ranges ──────────────────────────────────────────
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

    // empty fields rakhna hai, 0 nahi — isliye null hi use karenge
    if (this.capacityRanges.length === 0) {
      this.capacityRanges = [
        { minRange: null, maxRange: null, quantity: null },
      ];
    }
  }

  // ─── Cancel / Submit ──────────────────────────────────────────
  onCancel(): void {
    this.formCancelled.emit();
  }

  onSubmit(): void {
    if (!this.walletAddress.trim()) {
      this.snackBar.show("Wallet address is required.", false);
      return;
    }

    if (!this.generatedFile) {
      this.snackBar.show(
        this.qrSourceMode === "upload"
          ? "Please upload a QR image first."
          : "Please generate QR first.",
        false,
      );
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
      paymentMethod: this.mode || this.selectedMode,
      currency: this.selectedCurrency?.currency ?? this.currency?.currency,
      network: this.mode || this.selectedMode,
      walletAddress: this.walletAddress,
      holderName: this.accountHolderName,
      limitAmount: this.walletLimit,
      fttAcceptance: this.acceptsPpi || true,
      ranges: validRanges.length ? validRanges : null,
    };

    const formData = new FormData();
    formData.append(
      "dto",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
    formData.append("file", this.generatedFile, this.generatedFile.name);

    this.isSubmitting = true;
    this.crypto.addCrypto(formData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.snackBar.show(
          res.message || `${this.networkLabel} added successfully`,
          true,
        );
        this.formSubmitted.emit(payload);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.snackBar.show(
          err?.error?.message || `Error adding ${this.networkLabel}`,
          false,
        );
      },
    });
  }

  // ─── Wallet address generation (per network) ─────────────────
  generateWalletAddress(): void {
    switch (this.networkKey) {
      case "ERC20":
      case "BEP20":
        this.walletAddress = this.generateHexAddress();
        break;
      case "OMNI":
        this.walletAddress = this.pickRandom(this.omniAddressPool);
        break;
      case "TRC20":
        this.walletAddress = this.pickRandom(this.trc20AddressPool);
        break;
      case "SPL":
        this.walletAddress = this.generateSolanaAddress();
        break;
      default:
        this.walletAddress = "";
    }

    // address badalte hi purana QR / upload clear kar do
    this.clearQr();
  }

  onWalletAddressChanged(): void {
    this.clearQr();
  }

  private randomString(chars: string, length: number): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateHexAddress(): string {
    const hex = "0123456789abcdef";
    return "0x" + this.randomString(hex, 40);
  }

  private generateSolanaAddress(): string {
    const base58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    return this.randomString(base58, 44);
  }

  private pickRandom(list: string[]): string {
    return list[Math.floor(Math.random() * list.length)];
  }

  private readonly omniAddressPool = [
    "1CTncDxqNooXYMR6J4z3nyG3TaUhMYsq1i",
    "1B5ryrFjusSyGXYKNLfFnYeKDzdfXeKwcU",
    "1Ft8iMrjQem8qABn4MM4dJpDMkKcrfBYQ6",
    "1GR1faCEPtV25afeE5DcrWFSZh3QNLYvdy",
    "1EPab8ggW3zr4NheTrCSs1jbzpxWCvUQyd",
    "1Diy2SP35WrrBb8Hc3rwEMcbLJw7AsgK3y",
    "13T5NWqbv9hX1vJthnyfCxMxF4TVTnhiq3",
    "15RCB1YAHF81AjEFdRk7dx8YFgX2CvBfBh",
    "1DQu6MwWmep1FDKvyN67oEuZkVYMo4LZQJ",
    "1DBFYJsSanEqk5jk747w7vX7aSKaCdpVr1",
  ];

  private readonly trc20AddressPool = [
    "TQL9j9N37fQSyyEo3LdzcswT4EuJ6661Ut",
    "TRZYMRhVtyuF4kB7UJ8EyWzvUdKmY7VSb5",
    "TWyDyp8MLZPupjfThp8pXjt7xUtQXhVkLy",
    "TYGbYuwDmqx48nqYDAe6VXBVWigZkhhfye",
    "TSfXgDExuJrKrxkUW6z3pvtNu3SxYCPPCG",
    "TMeRpBTPSmwPhH9i33oJxX9PTmVBEsYpKp",
    "TQhRqKdRQd33TvZtq8MLe3cctENfVat8BU",
    "TVbvg8Ppk7FLftFxbJe4uJT941KLk15BR9",
    "TXq3rWfQtKRcAnF5dD58JA2cgpXXFpD7we",
    "TEQP8a49RVMVYsD6RzMS2jhBNz46zAq1Q2",
  ];

  // ─── QR: generate from address ─────────────────────────────────
  generateQrCode(): void {
    const address = this.walletAddress.trim();

    if (!address) {
      this.snackBar.show(
        "Please enter or generate a wallet address first.",
        false,
      );
      return;
    }

    // generate karte hi purana uploaded QR hata do — ek time pe ek hi preview
    this.revokePreviewUrl();
    this.uploadError = "";

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

  // ─── QR: manual upload ─────────────────────────────────────────
  onQrFileSelected(event: Event): void {
    this.uploadError = "";
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      this.uploadError = "Only PNG, JPG or WEBP images are allowed.";
      input.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      this.uploadError = "File must be smaller than 5MB.";
      input.value = "";
      return;
    }

    // upload karte hi purana generated QR hata do — ek time pe ek hi preview
    this.qrData = "";
    this.revokePreviewUrl();
    this.generatedFile = file;
    this.uploadedPreviewUrl = URL.createObjectURL(file);
    this.snackBar.show("QR image uploaded successfully", true);
    input.value = "";
  }

  removeQrCode(): void {
    this.clearQr();
  }

  private clearQr(): void {
    this.qrData = "";
    this.generatedFile = null;
    this.uploadError = "";
    this.revokePreviewUrl();
  }

  private revokePreviewUrl(): void {
    if (this.uploadedPreviewUrl) {
      URL.revokeObjectURL(this.uploadedPreviewUrl);
      this.uploadedPreviewUrl = null;
    }
  }
}
