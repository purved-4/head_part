import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class CommonDashboardService {
  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    return throwError(() => error);
  }

  getActiveEntities(entityId: any, entityType: any): Observable<any> {
    let params = new HttpParams();

    if (entityId) {
      params = params.set("entityId", entityId.toString());
    }

    if (entityType) {
      params = params.set("entityType", entityType.toString());
    }

    return this.http
      .get<any>(`${baseUrl}/dashboard/getActiveEntities`, {
        params,
      })
      .pipe(
        map((res) => {
          return res;
        }),
        catchError(this.handleError),
      );
  }

  getGraphData(
    entityId: any,
    entityType: any,
    fromDate: any,
    toDate: any,
  ): Observable<any> {
    let params = new HttpParams();
    params = params.set("entityId", entityId);
    params = params.set("entityType", entityType);
    params = params.set("fromDate", fromDate);
    params = params.set("toDate", toDate);
    return this.http.get<any>(`${baseUrl}/dashboard/getDataOfPayingAndPayout`, {
      params: params,
    });
  }
}
