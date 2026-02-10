import { HttpClient } from "@angular/common/http";
import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { Subject, Observable, of } from "rxjs";
import { map, catchError, tap } from "rxjs/operators";
import { Router } from "@angular/router";
import { isPlatformBrowser } from "@angular/common";
import { SnackbarService } from "../../common/snackbar/snackbar.service";
import baseUrl from "./helper";
import { UserStateService } from "../../store/user-state.service";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private isAuthenticated = false;
  private userData: any = null;
  public loginStatusSubject = new Subject<boolean>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private snack: SnackbarService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private userStateService: UserStateService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener("storage", (event) => {
        if (event.key === "authFlag") {
          if (event.newValue === "true") {
            this.getCurrentUser().subscribe();
          } else {
            this.clearSession();
          }
        }
      });
    }
  }

  public generateToken(loginData: any): Observable<any> {
    return this.http
      .post(`${baseUrl}/login`, loginData, { withCredentials: true })
      .pipe(
        tap(() => {
          this.isAuthenticated = true;
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem("authFlag", "true");
          }

          this.getCurrentUser().subscribe((res) => {
             
            this.userStateService.setCurrentUser(res);
          })
         }),
        catchError((err) => {
          this.snack.show("Invalid email or password", err.error.success, 4000);
          this.isAuthenticated = false;
          return of(err);
        })
      );
  }

  refreshToken(): Observable<any> {
    return this.http.post(
      `${baseUrl}/refresh-token`,
      {},
      { withCredentials: true }
    );
  }

  

  public getCurrentUser(): Observable<any> {
    return this.http
      .get(`${baseUrl}/current-user`, { withCredentials: true })
      .pipe(
        tap((user: any) => {
          this.userData = user?.data || null;
          this.isAuthenticated = !!this.userData;
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem("authFlag", "true");
          }
         
          
          this.loginStatusSubject.next(this.isAuthenticated);
        }),
        map((user: any) => user?.data || null),
        catchError(() => {
          return of(null);
        })
      );
  }

  public isLoggedIn(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) return of(false);
    const authFlag = localStorage.getItem("authFlag") === "true";
    if (!authFlag) return of(false);
    this.getCurrentUser().subscribe((res) => {
       
       const userId = this.userStateService.getUserId();
       this.loginStatusSubject.next(this.isAuthenticated);
       return userId ? of(true) : of(false);
    })
   
    return of(true);
  }

  public getUserRole(): string {
    return this.userData?.role?.[0]?.name || "GUEST";
  }

  public getUsername(): string {
    return this.userData?.username || "";
  }

  public getUserId(): string {
    return this.userData?.id || "";
  }

  public logout(): void {
    // this.cl  earSession();
    this.http
      .post(`${baseUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => this.forceNavigation(),
        error: () => this.forceNavigation(),
      });
  }

  public logoutForUserTime(): void {
    // this.cl  earSession();
    this.http
      .post(`${baseUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }

  private forceNavigation() {
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate(["/login"]).then((success) => {
        // if (!success) window.location.href = '/login';
      });
    }
  }

  private clearSession() {
    this.isAuthenticated = false;
    this.userData = null;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem("authFlag");
    }
    this.loginStatusSubject.next(false);
  }
}
