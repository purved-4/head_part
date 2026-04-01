import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { SubjectRegistryService } from "../../registery/subject-registry.service";

@Injectable({
  providedIn: "root",
})
export class AuthMemoryService {
  private readonly accessTokenKey = "accessToken";

  constructor(private subjectRegistry: SubjectRegistryService) {
    this.subjectRegistry.register(
      this.accessTokenKey,
      () => new BehaviorSubject<string | null>(null),
      null
    );
  }

  get accessToken$() {
    return this.subjectRegistry.getSubject(this.accessTokenKey)!.asObservable();
  }

  setAccessToken(token: string | null) {
    console.log("calls");

    this.subjectRegistry.setValue(this.accessTokenKey, token);
  }

  getAccessToken(): string | null {
    return this.subjectRegistry.getSubject(this.accessTokenKey)?.value ?? null;
  }

  resetAccessToken() {
    this.subjectRegistry.reset(this.accessTokenKey);
  }

  recreateAccessToken() {
    this.subjectRegistry.recreate(this.accessTokenKey);
  }
}