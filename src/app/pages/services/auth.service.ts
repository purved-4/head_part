import { HttpBackend, HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Subject, Observable,of, throwError } from "rxjs";
import { map, catchError, tap, switchMap, shareReplay, finalize } from "rxjs/operators";
import { Router } from "@angular/router";
import { SnackbarService } from "../../common/snackbar/snackbar.service";
import baseUrl from "./helper";
 import { SubjectRegistryService } from "../../registery/subject-registry.service";
import { AuthMemoryService } from "./auth-memory.service";
import { UserStateService } from "./store/user-state.service";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private isAuthenticated = false;
  private userData: any = null;
  public loginStatusSubject = new Subject<boolean>();
  private refreshHttp: HttpClient;

  // in-flight "load current user" request, shared across guards/components
  private userLoad$: Observable<any> | null = null;

  constructor(
    private http: HttpClient,
    private subjectRegistryService: SubjectRegistryService,
    private memoryService: AuthMemoryService,
    private userStateService: UserStateService,
    private router: Router,
    handler: HttpBackend,
    private snack: SnackbarService
  ) {
    this.refreshHttp = new HttpClient(handler);
  }

  private saveAuthToken(res: any) {
    const token = res?.data?.token;
    if (token) {
      this.memoryService.setAccessToken(token);
    }
  }

  public login(loginData: any): Observable<any> {
    return this.http
      .post(`${baseUrl}/login`, loginData, { withCredentials: true })
      .pipe(
        tap((res: any) => this.saveAuthToken(res)),
        catchError((err) => {
          this.isAuthenticated = false;
          err.message = "Login failed.";
          this.snack.show(err.message, false);
          return throwError(() => err);
        })
      );
  }

  public getCurrentUser(): Observable<any> {
    return this.http.get(`${baseUrl}/current-user`, { withCredentials: true }).pipe(
      map((user: any) => user?.data || null)
    );
  }

  /**
   * Single source of truth for "is the user loaded into state".
   * - If already logged in (state populated) -> resolves immediately, no HTTP call.
   * - If a load is already in-flight (e.g. guard + component both call at once)
   *   -> everyone shares the same request instead of firing duplicate calls.
   * - On success -> populates UserStateService.
   * - On failure -> clears state and propagates the error (caller decides redirect).
   */
public ensureUserLoaded(): Observable<any> {
  if (this.userStateService.getIsLoggedIn()) {
    return of(this.userStateService.currentUserValue);
  }

  if (!this.userLoad$) {
    this.userLoad$ = this.getCurrentUser().pipe(
      tap((user) => this.userStateService.setCurrentUser(user)),
      catchError((err) => {
        this.userStateService.setCurrentUser(null);
        return throwError(() => err);
      }),
      shareReplay(1),
      finalize(() => (this.userLoad$ = null))
    );
  }

  return this.userLoad$;
}

  loginAndLoadUser(loginData: any): Observable<any> {
    return this.login(loginData).pipe(
      switchMap(() => this.getCurrentUser()),
      tap((user) => {
        this.userStateService.setCurrentUser(user);
      })
    );
  }

  public logout(): any {
    let token = this.memoryService.getAccessToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .post<any>(`${baseUrl}/logout`, {}, { headers, withCredentials: true })
      .pipe(
        tap(() => {
          this.userStateService.setCurrentUser(null);
          this.memoryService.setAccessToken(null);
          token = null;
        }),
        map((res) => res),
        catchError((err) => {
          return throwError(() => err);
        })
      );
  }

 refreshToken(): Observable<any> {
  return this.refreshHttp
    .post(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
    .pipe(
      tap((res: any) => this.saveAuthToken(res)),
      catchError((err) => {
        this.memoryService.resetAccessToken();
        // navigation yahan se hata di — interceptor handle karega
        return throwError(() => err);
      }),
    );
}
}