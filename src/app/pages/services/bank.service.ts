import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";
import { catchError, map, Observable, throwError } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class BankService {
  constructor(private http: HttpClient) {}

  addBank(upi: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/banks/create`, upi);
  }

  update(upi: any): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/banks/update`, upi);
  }

  getBankDataWithSubAdminId(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/banks/getAllActiveByEntityId/${id}`);
  }

  getBankDataWithSubAdminIdPaginated(
    id: string,
    page: number = 0,
    size: number = 20,
  ): Observable<any> {
    return this.http.get<any>(
      `${baseUrl}/banks/getAllActiveByEntityId/paginated/${id}`,
      {
        params: {
          page: page.toString(),
          size: size.toString(),
        },
      },
    );
  }

  getBankDataWithEntityIdAndPortalId(id: any, portalId: any): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/banks/getAllByEntityIdAndPortalId/${id}/${portalId}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getAllByPortalId(portalId: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/banks/getAllByPortalId/${portalId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  toogleBankStatus(bankId: any): Observable<any[]> {
    return this.http
      .patch<any[]>(`${baseUrl}/banks/toggleStatus/${bankId}`, {})
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getBankDataWithSubAdminIdAndActivePaginated(
    id: string,
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

    return this.http.get<any>(
      `${baseUrl}/banks/getAllActiveByEntityId/paginated/${id}`,
      {
        params,
      },
    );
  }

  getBankDataWithSubAdminIdAndDeactivePaginated(
    id: string,
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

    return this.http.get<any>(
      `${baseUrl}/banks/getAllDeactiveByEntityId/paginated/${id}`,
      {
        params,
      },
    );
  }

  // getBankDataWithSubAdminIdPaginated(
  //     id: string,
  //     options: any = {},
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

  //     return this.http.get<any>(
  //      `${baseUrl}/banks/getAllActiveByEntityId/paginated/${id}`,
  //      {
  //         params,
  //      },
  //     );
  // }

  setLimitTime(id: any, data: any) {
    // Convert to ISO instant with seconds + Z
    const instantStr = new Date(data.dateTime).toISOString();

    return this.http.post(
      `${baseUrl}/banks/setLimitTime/${id}?limitTime=${instantStr}`,
      {},
    );
  }
  /** Add / update payin ranges */
  addPayinCapacity(payload: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/payin-capacity/add`, payload);
  }

  /** Fetch payin ranges for entity */
  getPayinCapacity(
    entityType: string,
    entityId: string,
     mode: "UPI" | "BANK",
    payinId: string,
  ): Observable<any> {
    const params = new HttpParams()
      .set("entityType", entityType)
      .set("entityId", entityId)
       .set("mode", mode)
      .set("payinId", payinId);

    return this.http
      .get<any>(`${baseUrl}/payin-capacity`, { params })
      .pipe(map((res) => res.data));
  }

  toggleIsBank(bankId: string): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/banks/${bankId}/toggle-isbank`, {});
  }

  assignPortalToBank(bankId: string, portalId: string): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/banks/${bankId}/assign-portal/${portalId}`, {})
      .pipe(
        catchError((error) => {
          throw error;
        }),
      );
  }

  removePortal(id: string): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/banks/${id}/remove-portal`, {})
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getAllByComPartWithPortal(comPartId: string): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/banks/getAllByComPartWithPortal/${comPartId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  searchBankAndUpi(query: string, comPartId: string) {
  return this.http.get<any>(
    `${baseUrl}/banks/searchBankAndUpi/${comPartId}`,
    {
      params: { query }
    }
  );
}

toogleBankDeleted(bankId: any): Observable<any[]> {
    return this.http
      .patch<any[]>(`${baseUrl}/banks/toggleDeleted/${bankId}`, {})
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }
}
