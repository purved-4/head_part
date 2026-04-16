import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";
import { catchError, Observable, throwError, map } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class PortalService {
  constructor(private http: HttpClient) {}

  getByPortalId(portalId: string): Observable<any> {
    return this.http.get(`${baseUrl}/portals/getById/${portalId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  generateUniqueId(): Observable<{ uniqueId: string }> {
    return this.http
      .get<{ uniqueId: string }>(`${baseUrl}/portals/generateUniqueId`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  // Generate token key
  generateToken(): Observable<{ token: string }> {
    return this.http
      .get<{ uniqueId: string }>(`${baseUrl}/portals/generateTokenKey`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  // Add new site
  addSite(site: any): Observable<any> {
    return this.http.post(`${baseUrl}/portals/create`, site);
  }

  // Optional: fetch all sites
  getById(userId: any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/portals/getById/${userId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }
  getAllPortal(): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/portals/getAll`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getAllPortalByAdminId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/portals/getPortalsByUserId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  deleteSite(userId: any): Observable<any[]> {
    return this.http.delete<any[]>(`${baseUrl}/portals/delete/${userId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  updateSite(data: any): Observable<any[]> {
    return this.http.patch<any[]>(`${baseUrl}/portals/update`, data).pipe(
      map((response: any) => response),
      catchError((error) => throwError(error)),
    );
  }

  addUserToPortal(payload: any, portalId: string): Observable<any> {
    return this.http.post(`${baseUrl}/allot-portal/${portalId}`, payload);
  }

  getUsersByPortalId(portalId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/portals/getUsersByPortalId/${portalId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  /// PORTAL QUESTION APIS

  addQuestionToPortal(questions: any): Observable<any> {
    return this.http.post(`${baseUrl}/messages/create`, questions);
  }

  updateQuestionToPortal(questions: any): Observable<any> {
    return this.http.patch(`${baseUrl}/messages/update`, questions);
  }

  deleteQuestionToPortal(messageId: any): Observable<any> {
    return this.http.delete(`${baseUrl}/messages/delete/${messageId}`);
  }

  getQuestionWithPortalId(portalId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/messages/getByPortal/${portalId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  // portal payout time apis

  addpayoutTime(questions: any): Observable<any> {
    return this.http.post(`${baseUrl}/processing-time/add`, questions);
  }

  updatepayoutTime(id: any, data: any): Observable<any> {
    return this.http.patch(`${baseUrl}/processing-time`, data);
  }

  getpayoutTimeWithPortalId(portalId: string): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/processing-time/${portalId}`).pipe(
      map((response: any) => response),
      catchError((error) => throwError(error)),
    );
  }

  deletepayoutTime(id: any): Observable<any> {
    return this.http.delete(`${baseUrl}/payout-times/delete/${id}`);
  }

  getPortalPercentage(portalId: string): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/owner/getPercentages/${portalId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

     // GET
getCurrenciesByEntity(entityId: any, entityRole: any): Observable<any> {
  return this.http
    .get<any>(`${baseUrl}/chief/currencies`, {
      params: {
        entityId: entityId,
        entityType: entityRole,
      },
    })
    .pipe(
      map((response) => response),
      catchError((error) => throwError(() => error))
    );
}
}
