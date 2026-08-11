import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class GlobalCurrencyService {
  constructor(private http: HttpClient) {}

  saveOwnerRate(data: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/global-currency`, data).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  getOwnerRate(id: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/global-currency/getByCreatedById/${id}`)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(() => error)),
      );
  }

  editOwnerRate(id: any,data:any): Observable<any> {
    return this.http
      .put<any>(`${baseUrl}/global-currency/${id}`,data)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(() => error)),
      );
  }
}