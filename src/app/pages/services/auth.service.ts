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
import { clearCurrencyData, setCurrencyData, } from "./currency-store.util";
@Injectable({
  providedIn: "root",
})
export class AuthService {
  private isAuthenticated = false;
  private userData: any = null;
  public loginStatusSubject = new Subject<boolean>();
  private refreshHttp: HttpClient;
   private authCheckFailed = false;


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
// @Injectable({
//   providedIn: "root",
// })
 

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
        tap((res: any) => {
          this.saveAuthToken(res);
          this.authCheckFailed = false; // naya login -> circuit reset
        }),
        catchError((err) => {
          this.isAuthenticated = false;
          err.message = "Login failed.";
          this.snack.show(err.message, false);
          return throwError(() => err);
        })
      );
  }

  // public getCurrentUser(): Observable<any> {
  //   return this.http.get(`${baseUrl}/current-user`, { withCredentials: true }).pipe(
  //     map((user: any) => user?.data || null)
  //   );
  // }
  public getCurrentUser(): Observable<any> {
  return this.http.get(`${baseUrl}/current-user`, { withCredentials: true }).pipe(
    map((user: any) => user?.data || null),
    tap((user: any) => {
      if (user?.currency) {
        setCurrencyData(user.currency);
      }
    })
  );
}

  public ensureUserLoaded(): Observable<any> {
  if (this.userStateService.getIsLoggedIn()) {
    return of(this.userStateService.currentUserValue);
  }

  if (this.authCheckFailed) {
    return throwError(() => new Error("Not authenticated"));
  }

  if (!this.userLoad$) {
    // Reload ke baad memory me token nahi hai -> seedha refresh se shuru karo,
    // current-user ko blind 401 khilwa ke phir retry karwana waste hai.
    const hasToken = !!this.memoryService.getAccessToken();
    const bootstrap$ = hasToken
      ? this.getCurrentUser()
      : this.refreshToken().pipe(switchMap(() => this.getCurrentUser()));

    this.userLoad$ = bootstrap$.pipe(
      tap((user) => {
        this.userStateService.setCurrentUser(user);
        this.authCheckFailed = false;
      }),
      catchError((err) => {
        this.userStateService.setCurrentUser(null);
        this.authCheckFailed = true;
        return throwError(() => err);
      }),
      shareReplay(1),
      finalize(() => (this.userLoad$ = null)),
    );
  }

  return this.userLoad$;
}

  loginAndLoadUser(loginData: any): Observable<any> {
    return this.login(loginData).pipe(
      switchMap(() => this.getCurrentUser()),
      tap((user) => {
        this.userStateService.setCurrentUser(user);
        this.authCheckFailed = false;
      })
    );
  }

  public logout(): any {
    let token = this.memoryService.getAccessToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    return this.http
      .post<any>(`${baseUrl}/logout`, {}, { headers, withCredentials: true })
      .pipe(
        tap(() => {
          this.userStateService.setCurrentUser(null);
          this.memoryService.setAccessToken(null);
          this.authCheckFailed = false; 
               clearCurrencyData();     
          token = null;
        }),
        map((res) => res),
        catchError((err) => throwError(() => err))
      );
  }

  refreshToken(): Observable<any> {
    return this.refreshHttp
      .post(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
      .pipe(
        tap((res: any) => this.saveAuthToken(res)),
        catchError((err) => {
          this.memoryService.resetAccessToken();
          return throwError(() => err);
        })
      );
  }
}