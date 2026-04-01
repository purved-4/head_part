import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { CurrentUser } from "./current-user-model";
import { SubjectRegistryService } from "../registery/subject-registry.service";

@Injectable({
  providedIn: "root",
})
export class UserStateService {
  private readonly USER_KEY = "currentUser";
  private readonly LOGIN_KEY = "isLoggedIn";

  constructor(
    private registry: SubjectRegistryService,
  ) {
    this.registry.register(
      this.USER_KEY,
      () => new BehaviorSubject<CurrentUser | null>(null),
      null
    );

    this.registry.register(
      this.LOGIN_KEY,
      () => new BehaviorSubject<boolean>(false),
      false
    );
  }

  get currentUser$(): Observable<CurrentUser | null> {
    return this.registry.getSubject(this.USER_KEY)!;
  }

  get isLoggedIn$(): Observable<boolean> {
    return this.registry.getSubject(this.LOGIN_KEY)!;
  }

  setCurrentUser(user: CurrentUser | null) {
    this.registry.setValue(this.USER_KEY, user);
    this.registry.setValue(this.LOGIN_KEY, !!user);

  }

  get currentUserValue(): CurrentUser | null {
    return this.registry.getSubject(this.USER_KEY)?.value ?? null;
  }

  getIsLoggedIn(): boolean {
    return !!this.currentUserValue;
  }

  getUserName(): string | null {
    return this.currentUserValue?.username || null;
  }

  getUserId(): string | null {
    return this.currentUserValue?.userId || null;
  }

  getRole(): any {
    const roles = this.currentUserValue?.role;
    if (!roles || roles.length === 0) return null;
    return roles[0]?.name ?? null;
  }

  getBranchId(): string | null {
    return this.currentUserValue?.branchId || null;
  }

  getheadId(): string | null {
    return this.currentUserValue?.headId || null;
  }

  getmanagerId(): string | null {
    return this.currentUserValue?.whoId || null;
  }

  getchiefId(): string | null {
    return this.currentUserValue?.chiefId || null;
  }

  getComPartId(): string | null {
    return this.currentUserValue?.comPartId || null;
  }

  getCurrentEntityId(): string | null {
    const role = this.getRole();
    switch (role) {
      case "BRANCH":
        return this.getBranchId();
      case "OWNER":
        return this.getUserId();
      case "HEAD":
        return this.getheadId();
      case "MANAGER":
        return this.getmanagerId();
      case "CHIEF":
        return this.getchiefId();
      case "COM_PART":
        return this.getComPartId();
      default:
        return null;
    }
  }
}