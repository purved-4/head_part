import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class ComPartService {
  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    return throwError(() => error);
  }

  addComPart(data: any): Observable<void> {
    return this.http.post<any>(`${baseUrl}/comPart/createComPart`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  addComPartUser(data: any): Observable<void> {
    return this.http.post<any>(`${baseUrl}/comPart/createComPart`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  updateComPart(data: any): Observable<void> {
    return this.http.patch<any>(`${baseUrl}/comPart/updateComPart`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  updateComPartUser(id: any, data: any): Observable<void> {
    return this.http.patch<any>(`${baseUrl}/updateUser/${id}`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  changeManualStatus(id: any, portalId: any): Observable<void> {
    return this.http
      .patch<any>(`${baseUrl}/comPart/changeManualStatus/${id}/${portalId}`, {})
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }
  toggleComPartStatus(id: any): Observable<void> {
    return this.http
      .patch<any>(`${baseUrl}/comPart/changeStatus/${id}`, {})
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getUserByComPartId(id: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getUsersByComPartId/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getComPartById(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/comPart/getComPartById/${id}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  getAllComPartByOwner(id: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getComPartsListByUserId/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getAllComPartByOwnerPaginated(
    id: any,
    page: any = 0,
    size: any = 10,
  ): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getComPartsListByUserId/paginated/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getPortalByComPartId(
    id: any,
    page: any = 0,
    size: any = 10,
  ): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/portals/getAllByComPartId/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getPercentageByComPartId(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/comPart/getPercentages/${id}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  allotComPartToUser(comPartId: string, payload: any): Observable<any> {
    return this.http
      .post<any>(`${baseUrl}/allot-comPart/${comPartId}`, payload)
      .pipe(
        map((res) => res),
        catchError(this.handleError),
      );
  }

  getUsersByComPartId(comPartId: string): Observable<any[]> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getUsersByComPartId/${comPartId}`)
      .pipe(
        map((res) => res.data || []),
        catchError(this.handleError),
      );
  }

  addQuestionToComPart(data: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/messages/create`, data).pipe(
      map((res) => ({
        ...res.data,
        message: res.message,
      })),
      catchError(this.handleError),
    );
  }

  updateQuestionToComPart(data: any): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/messages/update`, data).pipe(
      map((res) => ({
        ...res.data,
        message: res.message,
      })),
      catchError(this.handleError),
    );
  }

  deleteQuestionToComPart(messageId: any): Observable<any> {
    return this.http
      .delete<any>(`${baseUrl}/messages/delete/${messageId}`)
      .pipe(
        map((res) => ({
          message: res.message,
        })),
        catchError(this.handleError),
      );
  }
  getQuestionByComPartId(comPartId: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/messages/comPart/${comPartId}`).pipe(
      map((res) => res.data || []),
      catchError(this.handleError),
    );
  }

  getQuestionByComPartIdPaginated(
    comPartId: any,
    page: any = 0,
    size: any = 10,
  ): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/messages/comPart/paginated/${comPartId}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }
  getAllQuestions(page = 0, size = 10): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/messages/getAll/paginated?page=${page}&size=${size}`,
      )
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  sendWebhook(portalId: string, payload?: any, snap?: any): Observable<string> {
    const formData = new FormData();

    if (payload !== undefined && payload !== null) {
      formData.append("payload", JSON.stringify(payload));
    }

    if (snap) {
      formData.append("snap", snap);
    }

    return this.http.post(
      `${baseUrl}/manual/webhook/post/${portalId}`,
      formData,
      {
        responseType: "text",
      },
    );
  }

  getUpiDetails(portalId: any, minAmount: any, maxAmount: any) {
    return this.http
      .get(
        `${baseUrl}/manual/getUpiDetailsByAmountRange/${portalId}?minAmount=${minAmount}&maxAmount=${maxAmount}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getBankDetails(portalId: any, minAmount: any, maxAmount: any) {
    return this.http
      .get(
        `${baseUrl}/manual/getBankDetailsByAmountRange/${portalId}?minAmount=${minAmount}&maxAmount=${maxAmount}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  pinUpi(upiId: any, isPin: any) {
    return this.http.patch(`${baseUrl}/upi/${upiId}/pin?isPin=${isPin}`, {});
  }

  pinBank(bankId: any, isPin: any) {
    return this.http.patch(`${baseUrl}/banks/${bankId}/pin?isPin=${isPin}`, {});
  }

  changeStatusByUser(comPartId: string, userId: string) {
    const url = `${baseUrl}/comPart/changeStatusByUser/${comPartId}/${userId}`;
    return this.http.patch(url, {});
  }

  //domains
  addComPartDomain(comPartId: string, domain: any): Observable<any> {
    return this.http
      .post<any>(`${baseUrl}/comPart/${comPartId}/domains?domain=${domain}`, {})
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  updateComPartDomain(domainId: string, domain: any): Observable<any> {
    return this.http
      .put<any>(
        `${baseUrl}/comPart/domains/${domainId}?domainName=${domain}`,
        {},
      )
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getComPartDomain(comPartId: string): Observable<any> {
    return this.http.get<any>(`${baseUrl}/comPart/${comPartId}/domains`).pipe(
      map((response) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  deleteComPartDomain(domainId: any): Observable<any> {
    return this.http.delete<any>(`${baseUrl}/comPart/domains/${domainId}`).pipe(
      map((response) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }
}
