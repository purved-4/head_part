import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { CurrencyBehaviourService } from "../../../common/head_branch/payments-methods/currency-behaviour.service";

@Component({
  selector: "app-recycle-management",

  templateUrl: "./recycle-management.component.html",
  styleUrl: "./recycle-management.component.css",
})
export class RecycleManagementComponent implements OnInit, OnDestroy {
  selectedType: string = "bank";

  private modeSubscription!: Subscription;

  constructor(private currencyBehaviourService: CurrencyBehaviourService) {}

  ngOnInit(): void {
    this.modeSubscription = this.currencyBehaviourService.getMode().subscribe({
      next: (mode: string) => {
        if (mode) {
          // FIX: lowercase conversion
          this.selectedType = mode.toLowerCase();


        }
      },
      error: (err) => {

      },
    });
  }

  ngOnDestroy(): void {
    this.modeSubscription?.unsubscribe();
  }
}