import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, map, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class DynamicTimeSetupService {
  private api = `${baseUrl}/dynamic-time-setup`;

  constructor(private http: HttpClient) {}

  createSetup(data: any): Observable<any> {
    return this.http
      .post(`${this.api}`, data)
      .pipe(catchError(this.handleError));
  }

  getByOwnerId(ownerId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/owner/${ownerId}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  getAllSetups(): Observable<any> {
    return this.http.get<any>(`${this.api}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  getByCnfId(cnfId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/cnf/${cnfId}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  updateSetup(id: string, data: any): Observable<any> {
    return this.http
      .put(`${this.api}/${id}`, data)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    return throwError(() => error);
  }
}
