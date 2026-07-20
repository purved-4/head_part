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
}