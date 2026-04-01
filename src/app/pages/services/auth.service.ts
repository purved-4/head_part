import { HttpBackend, HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { Subject, Observable, of, throwError } from "rxjs";
import { map, catchError, tap, switchMap } from "rxjs/operators";
import { Router } from "@angular/router";
import { isPlatformBrowser } from "@angular/common";
import { SnackbarService } from "../../common/snackbar/snackbar.service";
import baseUrl from "./helper";
import { SubjectRegistryService } from "../../registery/subject-registry.service";
import { AuthMemoryService } from "./auth-memory.service";
import { UserStateService } from "../../store/user-state.service";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private isAuthenticated = false;
  private userData: any = null;
  public loginStatusSubject = new Subject<boolean>();
  private refreshHttp: HttpClient;


  constructor(
    private http: HttpClient,
    private subjectRegistryService: SubjectRegistryService,
    private memoryService: AuthMemoryService,
    private userStateService: UserStateService,
    handler: HttpBackend,
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
    return this.http.post(`${baseUrl}/login`, loginData, { withCredentials: true }).pipe(
      tap((res: any) => this.saveAuthToken(res)),
      catchError((err) => {
        this.isAuthenticated = false;
        return throwError(() => err);
      })
    );
  }

  public getCurrentUser(): Observable<any> {

    return this.http.get(`${baseUrl}/current-user`).pipe(
      map((user: any) => {
        return user?.data || null
      }),
      catchError(() => of(null))
    );
  }

  loginAndLoadUser(loginData: any): Observable<any> {
    return this.login(loginData).pipe(
      switchMap(() => {
        return this.getCurrentUser();
      }),
      tap((user) => {
        this.userStateService.setCurrentUser(user);
      })
    );
  }

  public logout(): any {
    let token = this.memoryService.getAccessToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http
      .post<any>(`${baseUrl}/logout`, {}, { headers, withCredentials: true })
      .pipe(
        tap(() => {
          this.subjectRegistryService.destroyAll();
          
          token = null
          
        }),
        map((res) => res),
        catchError((err) => {
          this.subjectRegistryService.destroyAll();
          // window.location.href = "/login"
          return throwError(() => err);
        })
      );
  }


  refreshToken(): Observable<any> {
    return this.refreshHttp.post(`${baseUrl}/refresh-token`, {}, { withCredentials: true }).pipe(
      tap((res: any) => this.saveAuthToken(res))
      
    );
  }

}