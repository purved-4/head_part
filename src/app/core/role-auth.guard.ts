import { Injectable } from "@angular/core";
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from "@angular/router";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { AuthService } from "../pages/services/auth.service";
import { UserStateService } from "../pages/services/store/user-state.service";

@Injectable({ providedIn: "root" })
export class RoleAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private userStateService: UserStateService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const allowedRoles: string[] = (route.data["roles"] ?? []).map((r: string) =>
      r.toLowerCase()
    );

    return this.authService.ensureUserLoaded().pipe(
      map(() => {
        const role = this.userStateService.getRole()?.toLowerCase();
        return allowedRoles.includes(role ?? "")
          ? true
          : this.router.createUrlTree(["/login"]);
      }),
      catchError(() => of(this.router.createUrlTree(["/login"])))
    );
  }
}