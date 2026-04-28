import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from "@angular/common/http";
import { Observable, throwError, BehaviorSubject, of } from "rxjs";
import { catchError, switchMap, filter, take, finalize } from "rxjs/operators";
import { AuthMemoryService } from "../pages/services/auth-memory.service";
import { AuthService } from "../pages/services/auth.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private memoryService: AuthMemoryService,
    private authService: AuthService,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  if (this.isAuthEndpoint(req.url)) {
    return next.handle(req);
  }

  const token = this.memoryService.getAccessToken();  

  const authReq = token ? this.addToken(req, token) : req;

  return next.handle(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status !== 401) {
        return throwError(() => error);
      }

      return this.handle401Error(req, next);
    })
  );
}

private handle401Error(req: HttpRequest<any>, next: HttpHandler) {
  if (this.isRefreshing) {
    return this.refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addToken(req, token)))
    );
  }

  this.isRefreshing = true;
  this.refreshTokenSubject.next(null);

  return this.authService.refreshToken().pipe(
    switchMap((res: any) => {
      const newToken = res?.data?.token;

      if (!newToken) {
        this.memoryService.resetAccessToken();
        return throwError(() => new Error("Refresh failed"));
      }
      this.refreshTokenSubject.next(newToken);

      return next.handle(this.addToken(req, newToken));
    }),
    catchError((err) => {
      this.memoryService.resetAccessToken();
      return throwError(() => err);
    }),
    finalize(() => {
      this.isRefreshing = false;
    })
  );
}

  private isAuthEndpoint(url: string): boolean {
    return url.includes("/login") || url.includes("/refresh-token")  ;
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

}