import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription, combineLatest } from "rxjs";
import { CurrencyBehaviourService } from "../payments-methods/currency-behaviour.service";
import { FIAT_MODES } from "../payments-methods/payments-methods.component";

@Component({
  selector: "app-recycle-management",
  templateUrl: "./recycle-management.component.html",
  styleUrl: "./recycle-management.component.css",
})
export class RecycleManagementComponent implements OnInit, OnDestroy {
  selectedType: string = "bank";
  selectedMode: string = "bank";
  selectedCurrency: any = null;

  private subscription!: Subscription;

  constructor(private currencyBehaviourService: CurrencyBehaviourService) {}

  ngOnInit(): void {
    this.subscription = combineLatest([
      this.currencyBehaviourService.getMode(),
      this.currencyBehaviourService.getCurrency(),
    ]).subscribe({
      next: ([mode, currency]) => {
        if (!mode) return;

        this.selectedMode = mode.toLowerCase();
        this.selectedCurrency = currency;

        // agar mode fiat list me nahi hai (bank/upi/qr) toh crypto hai
        this.selectedType = FIAT_MODES.includes(this.selectedMode)
          ? this.selectedMode
          : "crypto";

        console.log(
          "Selected Mode =>",
          this.selectedMode,
          "Type =>",
          this.selectedType,
        );
      },
      error: (err) => {

      },
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
