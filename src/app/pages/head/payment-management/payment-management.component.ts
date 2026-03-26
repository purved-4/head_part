
import { Component } from "@angular/core";

@Component({
  selector: "app-payment-management",

  templateUrl: "./payment-management.component.html",
  styleUrl: "./payment-management.component.css",
})
export class PaymentManagementComponent {
  selectedType = "bank"; // default
}