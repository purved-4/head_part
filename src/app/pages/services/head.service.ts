import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";
import { catchError, Observable, throwError, map } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class HeadService {
  constructor(private http: HttpClient) {}

  addHead(data: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/head/createHead`, data);
  }

  addHeadUser(data: any, HeadId: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/allot-head/${HeadId}`, data);
  }

  updateHead(data: any): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/head/updateHead`, data);
  }

  changeHeadstatus(id: any): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/head/changeStatus/${id}`, {});
  }

  changeHeadUserStatus(HeadId: any, userId: any): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/head/changeStatusByUser/${HeadId}/${userId}`,
      {},
    );
  }

  getHeadById(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/head/getHeadById/${id}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getHeadListByUserId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/head/getHeadsListByUserId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getHeadByUserId(id: any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/head/getHeadsByUserId/${id}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getHeadByManagerId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/head/getHeadByManagerId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getUsersByHeadId(id: any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/head/getUsersByHeadId/${id}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getHeadByPortalId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/head/getHeadsWithPortals/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllHeadsWithPortalsById(id: any, paymentMethod?: any): Observable<any[]> {
    let params: any = {};

    if (paymentMethod) {
      params.paymentMethod = paymentMethod;
    }

    return this.http
      .get<
        any[]
      >(`${baseUrl}/head/getAllHeadsWithPortalsById/${id}`, { params })
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }
  changeHeadPortalStatus(portalId: any, HeadId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/head/changeStatus/${HeadId}/${portalId}`,
      {},
    );
  }

  getAllHeadByOwner(
    search: string = "",
    page: number = 0,
    size: number = 20,
  ): Observable<any> {
    let params = new HttpParams().set("page", page).set("size", size);

    if (search && search.trim() !== "") {
      params = params.set("search", search.trim());
    }

    return this.http.get<any>(`${baseUrl}/head/owner/getAll`, { params }).pipe(
      map((response) => response.data), // Page<ChiefDTO>
      catchError((error) => throwError(() => error)),
    );
  }

  getHeadPortalPercentage(headId: string): Observable<any> {
    return this.http.get<any>(`${baseUrl}/head/getPercentages/${headId}`).pipe(
      map((response) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  toggleDashbaordPayin(headId: string): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/head/${headId}/toggle-payin`, {});
  }
}
