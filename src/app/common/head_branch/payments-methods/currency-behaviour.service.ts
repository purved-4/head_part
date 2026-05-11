import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { SubjectRegistryService } from "../../../registery/subject-registry.service";

export const PAYMENT_CURRENCY_KEY = "payment.currency";
export const PAYMENT_MODE_KEY = "payment.mode";

@Injectable({
  providedIn: "root",
})
export class CurrencyBehaviourService {
  constructor(private registryService: SubjectRegistryService) {
    this.initSubjects();
  }

  private initSubjects() {
    this.registryService.register(
      PAYMENT_CURRENCY_KEY,
      () => new BehaviorSubject<any>(null),
      null,
    );

    this.registryService.register(
      PAYMENT_MODE_KEY,
      () => new BehaviorSubject<string>("bank"),
      "bank",
    );
  }

  // =========================
  // CURRENCY
  // =========================

  setCurrency(currency: any) {
    this.registryService.setValue(PAYMENT_CURRENCY_KEY, currency);
  }

  getCurrency(): Observable<any> {
    return this.registryService
      .getSubject(PAYMENT_CURRENCY_KEY)!
      .asObservable();
  }

  // =========================
  // MODE
  // =========================

  setMode(mode: string) {
    this.registryService.setValue(PAYMENT_MODE_KEY, mode);
  }

  getMode(): Observable<string> {
    return this.registryService.getSubject(PAYMENT_MODE_KEY)!.asObservable();
  }

  // =========================
  // RESET
  // =========================

  resetAll() {
    this.registryService.reset(PAYMENT_CURRENCY_KEY);
    this.registryService.reset(PAYMENT_MODE_KEY);
  }
}
