import { Observable } from "rxjs";
import baseUrl from "../helper";
import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";

@Injectable({
  providedIn: "root",
})
export class WorkReportsService {

  constructor(private http: HttpClient) {}

  getWorkReportByUserId(userId: string): Observable<any> {
    return this.http.get(`${baseUrl}/work-reports/getByUserId/${userId}`);
  }

  getWorkReportByDate(payload:any): Observable<any> {
    let params = new HttpParams()
      .set("entityId", payload.entityId)
      .set("entityType", payload.entityType)
      .set("fromDate", `${payload.fromDate}T00:00:00`)
      .set("toDate", `${payload.toDate}T23:59:59`);

    return this.http.get(`${baseUrl}/work-reports/getByUserIdWithDate`, { params });
  }
}