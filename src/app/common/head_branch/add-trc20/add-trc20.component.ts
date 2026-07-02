import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { SnackbarService } from "../../snackbar/snackbar.service";
import { CryptoService } from "../../../pages/services/crypto.service";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";
import { Subscription } from "rxjs";
import { UserStateService } from "../../../store/user-state.service";

interface CapacityRange {
  fromAmount: number | null;
  toAmount: number | null;
  quantity: number | null;
}

@Component({
  selector: "app-add-trc20",
  templateUrl: "./add-trc20.component.html",
  styleUrl: "./add-trc20.component.css",
})
export class AddTrc20Component implements OnInit, OnDestroy {
  @Input() currency: any = null;
  @Input() embeddedMode = false;

  @Output() formSubmitted = new EventEmitter<any>();
  @Output() formCancelled = new EventEmitter<void>();

  readonly networkLabel = "TRC-20";

  walletAddress = "";
  accountHolderName = "";
  walletLimit: number | null = null;
  acceptsPpi = false;
  isSubmitting = false;
  selectedCurrency: any = null;
  selectedMode: any;
  showForm: any;
  modes: any;

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

    // empty fields rakhna hai, 0 nahi — isliye null hi use karenge
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

    // sirf valid (fully filled, >0, to > from) ranges hi payload me jayenge
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

    const payload = {
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

    this.isSubmitting = true;
    this.crypto.addCrypto(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.snackBar.show(res.message || "bep20 added successfully", true);

        this.formSubmitted.emit();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.snackBar.show(err?.error?.message || "Error adding bep20", false);
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
      case "TRC-20":
        // TRON Address
        this.walletAddress = this.generateTRC20Address();
        break;

      default:
        this.walletAddress = "";
    }
  }
  private randomString(chars: string, length: number): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTRC20Address(): string {
    const addresses = [
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

    const index = Math.floor(Math.random() * addresses.length);
    return addresses[index];
  }
}
