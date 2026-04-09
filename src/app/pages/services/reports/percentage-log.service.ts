import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "../helper";
import { DateTimeUtil } from "../../../utils/date-time.utils";
import { TimeZoneServiceService } from "../../../common/time-zone/time-zone-service.service";

@Injectable({
  providedIn: "root",
})
export class PercentageLogService {
  constructor(private http: HttpClient,  private timeZoneService: TimeZoneServiceService
) {}

getHistoryWithType(user: any): Observable<any> {
  const range = this.timeZoneService.getReportRange(
    user.fromDate,
    user.toDate
  );

  console.log(range.fromUtc);
  console.log(range.toUtc);
  
  

  let params = new HttpParams()
    .set("fromDate", range.fromUtc)   // ✅ converted UTC
    .set("toDate", range.toUtc)       // ✅ converted UTC
    .set("entityType", user.entityType);

  return this.http
    .get(`${baseUrl}/percentage/historyWithType`, { params })
    .pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error))
    );
}
}

// searchPanels(
//     panelName: string = "",
//     masterName: string = ""
//   ): Observable<any[]> {
//     const params = new HttpParams().set("panelName", panelName);

//     return this.http.get<any[]>(`${baseUrl}/panel/search`, { params }).pipe(
//       map((res: any) => res.data),
//       catchError((error) => throwError(error))
//     );
//   }
