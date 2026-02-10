import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "../helper";

@Injectable({
  providedIn: "root",
})
export class PercentageLogService {
  constructor(private http: HttpClient) {}

  getChiefsListByUserId(user: any): Observable<any> {
    let params = new HttpParams()
      .set("fromDate", `${user.fromDate}T10:00:00`)
      .set("toDate", `${user.toDate}T10:00:00`)
      .set("entityType", user.entityType)
      // .set("pageNumber", user.pageNumber)
      // .set("pageSize", user.pageSize);

    return this.http.get(`${baseUrl}/percentage/historyWithType`, { params }).pipe(
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
