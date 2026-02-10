import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
  HTTP_INTERCEPTORS,
} from "@angular/common/http";
import { Observable, throwError, BehaviorSubject } from "rxjs";
import { Router } from "@angular/router";
import { AuthService } from "../pages/services/auth.service";
 @Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);

  constructor(private loginService: AuthService, private router: Router) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // skip adding headers for refresh token API itself if needed
    const csrfToken = this.getCookie("XSRF-TOKEN");
    let authReq = req.clone({
      withCredentials: true,
      headers: csrfToken
        ? req.headers.set("X-XSRF-TOKEN", csrfToken)
        : req.headers,
    });

    return next.handle(authReq)
    // .pipe(
    //   catchError((error) => {
    //      if (
    //       error instanceof HttpErrorResponse &&
    //       error.status === 401 &&
    //       !req.url.includes("/refresh")
    //     ) {
    //       return this.handle401Error(authReq, next);
    //     }
    //     return throwError(() => error);
    //   })
    // );
  }

  // private handle401Error(
  //   request: HttpRequest<any>,
  //   next: HttpHandler
  // ): Observable<HttpEvent<any>> {
  //   if (!this.isRefreshing) {
  //     this.isRefreshing = true;
  //     this.refreshTokenSubject.next(null);

  //     return this.loginService.refreshToken().pipe(
  //       switchMap(() => {
  //         this.isRefreshing = false;
  //         this.refreshTokenSubject.next("done");
  //         // retry original request after refresh
  //         return next.handle(request);
  //       }),
  //       catchError((err) => {
  //         this.isRefreshing = false;
  //         this.router.navigate(["/login"]);
  //         return throwError(() => err);
  //       })
  //     );
  //   } else {
  //     // wait until refresh completes
  //     return this.refreshTokenSubject.pipe(
  //       filter((token) => token !== null),
  //       take(1),
  //       switchMap(() => next.handle(request))
  //     );
  //   }
  // }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop()?.split(";").shift() || null : null;
  }
}

export const authInterceptorProviders = [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true,
  },
];
