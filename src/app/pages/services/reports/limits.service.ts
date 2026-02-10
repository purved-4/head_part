import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "../helper";

@Injectable({
  providedIn: 'root'
})
export class LimitsService {

  constructor(private http: HttpClient) { }

 
 addLimits(LimitData: any): Observable<any> {
    return this.http.post(`${baseUrl}/entityLimit/add`, LimitData);
  }

  getLimitsByEntityAndType(entityId: any, type: any): Observable<any> {
    console.log("Fetching limits for entity ID:", entityId, "of type:", type);
    return this.http.get(`${baseUrl}/entityLimit/${entityId}/${type}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error))
    );
  }

   getLatestLimitsByEntityAndType(entityId: any, type: any): Observable<any> {
    return this.http.get(`${baseUrl}/entityLimit/latest/${entityId}/${type}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error))
    );
  }

}
