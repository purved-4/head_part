import { Inject, Injectable, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { BehaviorSubject, Observable } from "rxjs";
import { CurrentUser } from "./current-user-model";
import { SubjectRegistryService } from "../registery/subject-registry.service";

@Injectable({
  providedIn: "root",
})
export class UserStateService {
  private readonly USER_KEY = "currentUser";
  private readonly LOGIN_KEY = "isLoggedIn";
  private readonly CURRENCY_KEY_PREFIX = "currencies_";

  private isBrowser: boolean;

  constructor(
    private registry: SubjectRegistryService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.registry.register(
      this.USER_KEY,
      () => new BehaviorSubject<CurrentUser | null>(null),
      null,
    );

    this.registry.register(
      this.LOGIN_KEY,
      () => new BehaviorSubject<boolean>(false),
      false,
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

    if (user) {
      this.cacheCurrenciesFromUser(user); // 👈 NEW
    } else {
      this.clearStoredCurrencies();
    }
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

  // =========================================================
  //  CURRENCY CACHE (HEAD / BRANCH only) — getCurrentUser ke
  // =========================================================

  private cacheCurrenciesFromUser(user: any): void {
    if (!this.isBrowser) return;

    const role = (this.getRole() || "").toUpperCase();
    if (role !== "HEAD" && role !== "BRANCH") return; // sirf HEAD/BRANCH ke liye cache

    const entityId = this.getCurrentEntityId();
    if (!entityId) return;

    const rawCurrencies = user?.currency?.currencies || [];

    // sirf true modes rakho, false wale drop karo
    const filtered = rawCurrencies
      .map((c: any) => {
        const trueModes: any = {};
        Object.keys(c.modes || {}).forEach((k) => {
          if (c.modes[k] === true) trueModes[k] = true;
        });
        return { ...c, modes: trueModes };
      })
      .filter((c: any) => Object.keys(c.modes).length > 0); // sab modes false → currency hi hata do

    try {
      localStorage.setItem(
        `${this.CURRENCY_KEY_PREFIX}${role}_${entityId}`,
        JSON.stringify(filtered),
      );
    } catch {
      // storage full/blocked — silently ignore, fallback API le lega
    }
  }

  getStoredCurrencies(): { data: { currencies: any[] } } | null {
    if (!this.isBrowser) return null;

    const role = (this.getRole() || "").toUpperCase();
    if (role !== "HEAD" && role !== "BRANCH") return null;

    const entityId = this.getCurrentEntityId();
    if (!entityId) return null;

    const raw = localStorage.getItem(
      `${this.CURRENCY_KEY_PREFIX}${role}_${entityId}`,
    );
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return { data: { currencies: parsed } };
    } catch {
      return null;
    }
  }

  clearStoredCurrencies(): void {
    if (!this.isBrowser) return;
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(this.CURRENCY_KEY_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  }
}
