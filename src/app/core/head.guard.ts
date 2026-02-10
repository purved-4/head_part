
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
import { UserStateService } from "../store/user-state.service";

@Injectable({
  providedIn: "root",
})
export class HeadAuthGuard implements CanActivate {
  constructor(private login: AuthService, private router: Router,private userStateService:UserStateService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {

       const isLoggedIn = this.userStateService.getIsLoggedIn();

 
        const userRole = this.userStateService.getRole()?.toLowerCase();

        if (isLoggedIn && userRole === "head") {
          return true;
        }
        return this.router.createUrlTree(["/login"]);
    
  }
}
