import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { HttpClient, HttpParams } from "@angular/common/http";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class UpiService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/upi/getAll`);
  }

  getBybranchId(id: any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/upi/getAllActiveByEntityId/${id}`);
  }

  getByBranchIdPaginated(
    id: string,
    page: number = 0,
    size: number = 20,
  ): Observable<any> {
    return this.http.get<any>(
      `${baseUrl}/upi/getAllActiveByEntityId/paginated/${id}`,
      {
        params: {
          page: page.toString(),
          size: size.toString(),
        },
      },
    );
  }

  getAllByEntityIdAndPortalId(id: any, portalId: any): Observable<any[]> {
    return this.http
      .get<
        any[]
      >(`${baseUrl}/upi/getAllByEntityIdAndPortalId/${id}/${portalId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getAllByPortalId(portalId: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/upi/getAllByPortalId/${portalId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }
  add(upi: FormData): Observable<any> {
    return this.http.post<any>(`${baseUrl}/upi/create`, upi);
  }

  updateUpi(upi: FormData): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/upi/update`, upi);
  }

  toogleUpiStatus(upiId: any): Observable<any[]> {
    return this.http
      .patch<any[]>(`${baseUrl}/upi/toggleStatus/${upiId}`, {})
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getByEntityIdAndActivePaginated(
    entityId: string,
    options: any = {},
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", options.page?.toString() ?? "0")
      .set("size", options.size?.toString() ?? "20");

    if (options.query) params = params.set("query", options.query);
    if (options.minAmount !== undefined && options.maxAmount !== undefined) {
      params = params.set("minAmount", options.minAmount.toString());
      params = params.set("maxAmount", options.maxAmount.toString());
    }
    if (options.active !== undefined && options.active !== null) {
      params = params.set("active", options.active.toString());
    }
    if (options.portalId) params = params.set("portalId", options.portalId);
    if (options.limit && options.limit > 0) {
      params = params.set("limit", options.limit.toString());
    }

    if (options.status) {
      params = params.set("status", options.status);
    }

    return this.http
      .get<any>(`${baseUrl}/upi/getAllActiveByEntityId/paginated/${entityId}`, {
        params,
      })
      .pipe(map((res) => res.data));
  }

  // getByBranchIdPaginated(
  //     entityId: string,
  //     options: UpiFilterOptions = {},
  // ): Observable<any> {
  //     let params = new HttpParams()
  //      .set("page", options.page?.toString() ?? "0")
  //      .set("size", options.size?.toString() ?? "20");

  //     if (options.query) params = params.set("query", options.query);
  //     if (options.minAmount !== undefined && options.maxAmount !== undefined) {
  //      params = params.set("minAmount", options.minAmount.toString());
  //      params = params.set("maxAmount", options.maxAmount.toString());
  //     }
  //     if (options.active !== undefined && options.active !== null) {
  //      params = params.set("active", options.active.toString());
  //     }
  //     if (options.portalId) params = params.set("portalId", options.portalId);
  //     if (options.limit && options.limit > 0) {
  //      params = params.set("limit", options.limit.toString());
  //     }

  //     return this.http
  //      .get<any>(`${baseUrl}/upi/getAllActiveByEntityId/paginated/${entityId}`, {
  //         params,
  //      })
  //      .pipe(map((res) => res.data));
  // }

  getByEntityIdAndDeactivePaginated(
    entityId: string,
    options: any = {},
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", options.page?.toString() ?? "0")
      .set("size", options.size?.toString() ?? "20");

    if (options.query) params = params.set("query", options.query);
    if (options.minAmount !== undefined && options.maxAmount !== undefined) {
      params = params.set("minAmount", options.minAmount.toString());
      params = params.set("maxAmount", options.maxAmount.toString());
    }
    if (options.portalId) params = params.set("portalId", options.portalId);
    if (options.limit && options.limit > 0) {
      params = params.set("limit", options.limit.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/upi/getAllDeactiveByEntityId/paginated/${entityId}`,
        {
          params,
        },
      )
      .pipe(map((res) => res.data));
  }

  setLimitTime(id: string, data: any) {
    const instantStr = new Date(data.dateTime).toISOString();

    return this.http.post(
      `${baseUrl}/upi/setLimitTime/${id}?limitTime=${instantStr}`,
      {},
    );
  }

  // new
  getPayinCapacity(
    entityType: string,
    entityId: string,
    portalId: string,
    mode: "UPI" | "BANK",
    payinId: string,
  ): Observable<any> {
    const params = new HttpParams({
      fromObject: {
        entityType,
        entityId,
        portalId,
        mode,
        payinId: payinId,
      },
    });

    return this.http.get<any>(`${baseUrl}/payin-capacity`, { params }).pipe(
      map((res) => res.data),
      catchError((err) => throwError(() => err)),
    );
  }

  addPayinCapacity(payload: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/payin-capacity/add`, payload);
  }

  toggleIsUpi(id: string): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/upi/${id}/toggle-isupi`, {});
  }
}
