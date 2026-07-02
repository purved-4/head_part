import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map, tap, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class CryptoService {
  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    return throwError(() => error);
  }
  addCrypto(data: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/crypto`, data).pipe(
      map((res) => res),
      catchError(this.handleError),
    );
  }
  getCrypto(
    entityId: any,
    entityType: any,
    paymentMethod: any,
    options: { page: number; size: number } = { page: 0, size: 10 },
  ): Observable<any> {
    let params = new HttpParams();

    if (paymentMethod) {
      params = params.set("paymentMethod", paymentMethod);
    }
    if (options.page !== undefined) {
      params = params.set("page", options.page.toString());
    }
    if (options.size !== undefined) {
      params = params.set("size", options.size.toString());
    }

    return this.http
      .get<any>(`${baseUrl}/crypto/paginated/${entityId}/${entityType}`, {
        params,
      })
      .pipe(
        tap((res) => console.log("SERVICE RESPONSE =>", res)),
        map((res) => {
          console.log("SERVICE DATA =>", res.data.content);
          return res.data;
        }),
        catchError(this.handleError),
      );
  }
  getCryptoById(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/crypto/${id}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }
  updateCrypto(id: any, data: any): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/crypto/${id}`, data).pipe(
      map((res) => res),
      catchError(this.handleError),
    );
  }
  deleteCrypto(id: any, data: any): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/crypto/toggleDeleted/${id}`, data)
      .pipe(
        map((res) => res),
        catchError(this.handleError),
      );
  }
  setLimitTime(id: any, data: any): Observable<any> {
    const instantStr = new Date(data.dateTime).toISOString();

    return this.http
      .post<any>(
        `${baseUrl}/crypto/setLimitTime/${id}?limitTime=${instantStr}`,
        data,
      )
      .pipe(
        map((res) => res),
        catchError(this.handleError),
      );
  }

  getDeletedCrypto(
    entityId: any,
    entityType: any,
    paymentMethod: any,
    options: { page: number; size: number } = { page: 0, size: 10 },
  ): Observable<any> {
    let params = new HttpParams();

    if (paymentMethod) {
      params = params.set("paymentMethod", paymentMethod);
    }
    if (options.page !== undefined) {
      params = params.set("page", options.page.toString());
    }
    if (options.size !== undefined) {
      params = params.set("size", options.size.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/crypto/getAllDeactiveByEntityId/paginated/${entityId}/${entityType}`,
        { params },
      )
      .pipe(
        tap((res) => console.log("SERVICE RESPONSE =>", res)),
        map((res) => {
          console.log("SERVICE DATA =>", res.data);
          return res.data;
        }),
        catchError(this.handleError),
      );
  }

  toggleCryptoStatus(id: any, paymentMethod: any): Observable<any> {
    let params = new HttpParams();

    if (paymentMethod) {
      params = params.set("paymentMethod", paymentMethod);
    }

    return this.http
      .patch<any>(
        `${baseUrl}/crypto/${id}/toggle-crypto`,
        {}, // body
        { params }, // query params
      )
      .pipe(
        map((res) => res),
        catchError(this.handleError),
      );
  }

   getCryptoByAmountManual(
    portalId: any,
    amount?: any,
    currency?: any,
    userId?: string,
    isSkip?: boolean,
    isNew?: boolean,
    paymentMode?: string,
    currentPayinId?: string,
  ) {
    let params = new HttpParams();

    if (amount != null && amount > 0) {
      params = params.set("amount", amount);
    }

    if (currency) {
      params = params.set("currency", currency);
    }

    if (userId != null) {
      params = params.set("userId", userId);
    }

    if (isSkip != null) {
      params = params.set("isSkip", isSkip);
    }

    if (isNew != null) {
      params = params.set("isNew", isNew);
    }

    if (paymentMode != null) {
      params = params.set("paymentMode", paymentMode);
    }

    if (currentPayinId != null) {
      params = params.set("currentPayinId", currentPayinId);
    }

    return this.http
      .get(`${baseUrl}/manual/getCryptoDetailsByAmountRange/${portalId}`, {
        params,
      })
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }
}