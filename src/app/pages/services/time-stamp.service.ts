import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { HttpClient } from "@angular/common/http";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class TimeStampService {
  constructor(private http: HttpClient) {}

  addtopupTimeStamp(data: any): Observable<any[]> {
    return this.http
      .post<any[]>(`${baseUrl}/api/owner/reward/topup`, data)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(error))
      );
  }

  addpayoutTimeStamp(data: any): Observable<any[]> {
    return this.http
      .post<any[]>(`${baseUrl}/api/owner/reward/payout`, data)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(error))
      );
  }

  getByWebsiteIdAndbranchIdTypeAndMode(websiteId: any, entityId: any,entityType:any,type:any,mode:any): Observable<any[]> {
    return this.http
      .get<any[]>(
        `${baseUrl}/api/owner/reward/reward`,{ params: { websiteId, entityId ,entityType,type,mode} }
      )
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(error))
      );
  }

  updateTimeStamp(id: any, data: any): Observable<any[]> {
    return this.http
      .patch<any[]>(`${baseUrl}/api/reward-percentages/update/${id}`, data)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(error))
      );
  }


  addTimeStampBulk(data: any): Observable<any[]> {
    return this.http
      .post<any[]>(`${baseUrl}/api/commission-percentages/add/bulk`, data)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(error))
      );
  }


  
}
