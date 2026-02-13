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
    return this.http.get<any>(`${baseUrl}/banks/getAllByEntityId/${id}`);
  }

  getBankDataWithSubAdminIdPaginated(
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
    if (options.websiteId) params = params.set("websiteId", options.websiteId);
    if (options.limit && options.limit > 0) {
      params = params.set("limit", options.limit.toString());
    }

    return this.http.get<any>(
      `${baseUrl}/banks/getAllByEntityId/paginated/${id}`,
      {
        params,
      },
    );
  }

  getBankDataWithEntityIdAndWebsiteId(
    id: any,
    websiteId: any,
  ): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/banks/getAllByEntityIdAndWebsiteId/${id}/${websiteId}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getAllByWebsiteId(websiteId: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/banks/getAllByWebsiteId/${websiteId}`)
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
}
