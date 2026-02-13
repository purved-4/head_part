import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { HttpClient, HttpParams } from "@angular/common/http";
import baseUrl from "./helper";

export interface UpiFilterOptions {
  page?: number;
  size?: number;
  query?: string;
  minAmount?: number;
  maxAmount?: number;
  active?: boolean | null;
  websiteId?: string;
  limit?: number;
}

@Injectable({
  providedIn: "root",
})
export class UpiService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/upi/getAll`);
  }

  getBybranchId(id: any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/upi/getAllByEntityId/${id}`);
  }

  /**
   * Server‑side paginated & filtered call – accepts a single options object.
   */
  getByBranchIdPaginated(
    entityId: string,
    options: UpiFilterOptions = {},
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

    return this.http
      .get<any>(`${baseUrl}/upi/getAllByEntityId/paginated/${entityId}`, {
        params,
      })
      .pipe(map((res) => res.data));
  }

  getAllByEntityIdAndWebsiteId(id: any, websiteId: any): Observable<any[]> {
    return this.http.get<any[]>(
      `${baseUrl}/upi/getAllByEntityIdAndWebsiteId/${id}/${websiteId}`,
    );
  }

  getAllByWebsiteId(websiteId: any): Observable<any[]> {
    return this.http.get<any[]>(
      `${baseUrl}/upi/getAllByWebsiteId/${websiteId}`,
    );
  }

  add(upi: FormData): Observable<any> {
    return this.http.post<any>(`${baseUrl}/upi/create`, upi);
  }

  updateUpi(upi: FormData): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/upi/update`, upi);
  }

  toogleUpiStatus(upiId: any): Observable<any[]> {
    return this.http.patch<any[]>(`${baseUrl}/upi/toggleStatus/${upiId}`, {});
  }
}
