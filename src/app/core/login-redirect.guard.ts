import { Injectable } from "@angular/core";
import { CanActivate, Router, UrlTree } from "@angular/router";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { AuthService } from "../pages/services/auth.service";
import { UserStateService } from "../pages/services/store/user-state.service";

@Injectable({ providedIn: "root" })
export class LoginRedirectGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private userStateService: UserStateService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.ensureUserLoaded().pipe(
      map(() => {
        if (!this.userStateService.getIsLoggedIn()) return true;
        const role = (this.userStateService.getRole() ?? "").toLowerCase();
        const home = `/${role === "com_part" ? "comPart" : role}`;
        
        return this.router.createUrlTree([home]);
      }),
      catchError(() => of(true)) // not logged in -> stay put
    );
  }
}