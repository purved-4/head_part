import { Observable } from "rxjs";
import baseUrl from "../helper";
import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { DateTimeUtil } from "../../../utils/date-time.utils";

@Injectable({
  providedIn: "root",
})
export class WorkReportsService {
  constructor(private http: HttpClient) {}

  getWorkReportByUserId(userId: string): Observable<any> {
    return this.http.get(`${baseUrl}/work-reports/getByUserId/${userId}`);
  }

  getWorkReportByDate(payload: any): Observable<any> {
    let params = new HttpParams()
      .set("entityId", payload.entityId)
      .set("entityType", payload.entityType)
      .set("fromDate", DateTimeUtil.toUtcISOString(payload.from))
      .set("toDate", DateTimeUtil.toUtcISOString(payload.to));

    return this.http.get(`${baseUrl}/work-reports/getByUserIdWithDate`, {
      params,
    });
  }
}