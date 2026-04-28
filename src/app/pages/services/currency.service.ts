import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {

  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    return throwError(() => error);
  }


  addCustomCurrencyForHeadAndBranch(data: any): Observable<void> {
    return this.http.post<any>(`${baseUrl}/chief/currencies/custom`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }


   getCurrencyForHeadAndBranch(entityId: any, entityType:any): Observable<void> {
    return this.http.get<any>(`${baseUrl}/chief/currencies/custom/${entityId}/${entityType}`, ).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }


  

}
