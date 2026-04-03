import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { SubjectRegistryService } from "../../registery/subject-registry.service";
import { BALANCE_SHARING_KEY } from "../../registery/subject-registry.key";

@Injectable({
  providedIn: "root",
})
export class BalanceService {
  private readonly key = BALANCE_SHARING_KEY;

  constructor(private subjectRegistry: SubjectRegistryService) {
    this.subjectRegistry.register(
      this.key,
      () => new BehaviorSubject<any>(null),
      null
    );
  }

  get balance$() {
    return this.subjectRegistry.getSubject(this.key)!.asObservable();
  }

  setBalance(data: any) {
    this.subjectRegistry.setValue(this.key, data);
  }

  resetBalance() {
    this.subjectRegistry.reset(this.key);
  }

  recreateBalance() {
    this.subjectRegistry.recreate(this.key);
  }
}