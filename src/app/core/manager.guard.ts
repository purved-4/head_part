import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../pages/services/auth.service';
import { UserStateService } from '../store/user-state.service';

@Injectable({
  providedIn: 'root',
})
export class ManagerAuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private userStateService: UserStateService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {

     if (this.userStateService.getIsLoggedIn()) {
      const role = this.userStateService.getRole()?.toLowerCase();
      return of(role === 'manager' ? true : this.router.createUrlTree(['/login']));
    }

     return this.authService.getCurrentUser().pipe(
      map((res) => {
        this.userStateService.setCurrentUser(res);

        const role = this.userStateService.getRole()?.toLowerCase();

        if (role === 'manager') {
          return true;
        }

        return this.router.createUrlTree(['/login']);
      }),
      catchError(() => {
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}