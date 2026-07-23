import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";
import { catchError, map, Observable, throwError } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AffiliateService {
  constructor(private http: HttpClient) {}

  addAffilated(data: any): Observable<any> {
    return this.http.post(`${baseUrl}/affiliate/create`, data).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }
  getAffiliateByHeadId(headId: any): Observable<any> {
    return this.http.get(`${baseUrl}/affiliate/getByHead/${headId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  toggleAffiliateStatus(id: any): Observable<any> {
  return this.http.patch(`${baseUrl}/affiliate/toggleStatus/${id}`, {}).pipe(
    map((response: any) => response.data),
    catchError((error) => throwError(() => error)),
  );
}
}