import { HttpClient, HttpParams } from "@angular/common/http";
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


  getByParentCurrency(currency: string): Observable<any> {
    return this.http
      .get(`${baseUrl}/global-currency/by-parent-currency/${currency}`)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(() => error)),
      );
  }

getByParentCurrencyHistory(
    currency: string,
    fromDate: string,
    toDate: string,
    page: number = 0,
    size: number = 20,
  ): Observable<any> {
    const params = new HttpParams()
      .set("fromDate", fromDate)
      .set("toDate", toDate)
      .set("page", page)
      .set("size", size);

    return this.http
      .get(`${baseUrl}/global-currency/history/${currency}`, { params })
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(() => error)),
      );
  }

  updateDefaultRate(
    id: string | null,
    payload: any,
    chiefIds: string[],
    comPartIds: string[],
  ): Observable<any> {
    let params = new HttpParams();
    chiefIds.forEach((c) => (params = params.append("chiefIds", c)));
    comPartIds.forEach((c) => (params = params.append("comPartIds", c)));

    const url = id
      ? `${baseUrl}/global-currency/deafault/${id}`
      : `${baseUrl}/global-currency/deafault`;
    return this.http.put(url, payload, { params });
  }


}