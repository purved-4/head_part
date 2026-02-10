import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CurrentUser } from './current-user-model';

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  setCurrentUser(user: CurrentUser | null) {
    this.currentUserSubject.next(user);
    this.isLoggedInSubject.next(!!user);
  }

  getCurrentUser(): Observable<CurrentUser | null> {
    return this.currentUser$;
  }

  get currentUserValue(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  getIsLoggedIn(): boolean {
    return this.currentUserValue !== null;
  }

  getUserId(): string | null {
    return this.currentUserValue?.userId || null;
  }

  getRole(): string | null {
    const roles = this.currentUserValue?.role;
    if (!roles || roles.length === 0) return null;
    return (roles[0]?.name ?? null);
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

  getWebsiteId(): string | null {
    return this.currentUserValue?.websiteId || null;
  }

  getCurrentRoleId(): string | null {
    const role = this.getRole();
    switch (role) {
      case 'BRANCH': return this.getBranchId();
      case 'OWNER': return this.getUserId();
      case 'HEAD': return this.getheadId();
      case 'MANAGER': return this.getmanagerId();
      case 'CHIEF': return this.getchiefId();
      case 'OTHER': return this.getWebsiteId();
      default: return null;
    }
  }
}
