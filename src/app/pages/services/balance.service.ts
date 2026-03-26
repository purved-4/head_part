import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { SubjectRegistryService } from "../../registery/subject-registry.service";

@Injectable({
  providedIn: "root",
})
export class BalanceService {
  private readonly key = "balance";

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