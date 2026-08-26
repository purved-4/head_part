import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from "@angular/common/http";
import { Observable, throwError, BehaviorSubject, from } from "rxjs";
import { catchError, switchMap, filter, take, finalize } from "rxjs/operators";
import { Router } from "@angular/router";
import { AuthMemoryService } from "../pages/services/auth-memory.service";
import { AuthService } from "../pages/services/auth.service";
import { FingerprintService } from "../pages/services/fingerprint.service";
import { UserStateService } from "../pages/services/store/user-state.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  private readonly OPEN_LINK_PATHS = [
    "/api/anonymous/getBankDetailsByAmount",
    "/api/anonymous/getUpiDetailsByAmount",
    "/api/anonymous/webhook/post",
    "/api/anonymous/verify",
    "/api/anonymous/remove-assignment",
    "/api/ocr/anonymous",
    "/api/anonymous/getFile",
    "/api/anonymous/favourites/add",
    "/api/anonymous/favourites/user",
    "/api/anonymous/favourites/delete",
    "/api/anonymous/selectFavBank",
    "/api/anonymous/getCryptoDetailsByAmountRange",
  ];

  constructor(
    private memoryService: AuthMemoryService,
    private authService: AuthService,
    private fingerprintService: FingerprintService,
    private userStateService: UserStateService,
    private router: Router,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    if (this.isAuthEndpoint(req.url)) {
      return next.handle(req);
    }

    const isOpenLinkRequest = this.OPEN_LINK_PATHS.some((path) =>
      req.url.includes(path),
    );

    if (isOpenLinkRequest) {
      return from(this.fingerprintService.getFingerprint()).pipe(
        switchMap((fp) => {
          const withFp = req.clone({
            setHeaders: { "X-Device-FP": fp },
          });
          return next.handle(withFp);
        }),
      );
    }

    const token = this.memoryService.getAccessToken();
    const authReq = token ? this.addToken(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) {
          return throwError(() => error);
        }
        return this.handle401Error(req, next);
      }),
    );
  }

  private handle401Error(req: HttpRequest<any>, next: HttpHandler) {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap((token) => next.handle(this.addToken(req, token))),
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.authService.refreshToken().pipe(
      switchMap((res: any) => {
        const newToken = res?.data?.token;
        if (!newToken) {
          this.handleAuthFailure();
          return throwError(() => new Error("Refresh failed"));
        }
        this.refreshTokenSubject.next(newToken);
        return next.handle(this.addToken(req, newToken));
      }),
      catchError((err) => {
        this.handleAuthFailure();
        return throwError(() => err);
      }),
      finalize(() => {
        this.isRefreshing = false;
      }),
    );
  }

  /** Single place that clears session + redirects — with a loop guard */
  private handleAuthFailure(): void {
    this.memoryService.resetAccessToken();
    this.userStateService.setCurrentUser(null);

    const currentUrl = this.router.url.split("?")[0];
    const publicUrls = ["/login", "/", "/open"];

    // agar already login/public page pe hain, dobara navigate mat karo -> loop rukta hai
    if (!publicUrls.includes(currentUrl)) {
      this.router.navigate(["/login"]);
    }
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes("/login") || url.includes("/refresh-token");
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}