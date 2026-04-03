import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class ManagerService {
  constructor(private http: HttpClient) {}

  addManager(data: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/manager/createManager`, data);
  }

  getManagerById(id: any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/manager/getManagerById/${id}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getManagerByUserId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/manager/getManagersByUserId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getManagersByAgentId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/manager/getManagersByChiefId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  toggleManagerStatus(agentId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/manager/changeStatus/${agentId}`,
      {},
    );
  }

  toggleManagerUserStatus(agentId: string, userId: any): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/manager/changeStatusByUser/${agentId}/${userId}`,
      {},
    );
  }

  addUserToManager(payload: any, userId: string): Observable<any> {
    return this.http.post(`${baseUrl}/allot-manager/${userId}`, payload);
  }

  getUsersByManagerId(userId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/manager/getUsersByManagerId/${userId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }
  getManagersByChiefId(cnfId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/manager/getManagersByChiefId/${cnfId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getPortalByManagerId(managerId: string): Observable<any[]> {
    return this.http
      .get<
        any[]
      >(`${baseUrl}/manager/getAllManagersWithPortalsById/${managerId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  updateManager(data: any): Observable<any[]> {
    return this.http
      .patch<any[]>(`${baseUrl}/manager/updateManager`, data)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  changeManagerPortalStatus(portalId: any, ManagerId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/manager/changeStatus/${ManagerId}/${portalId}`,
      {},
    );
  }

  getAllManagerByOwner(
    search: string = "",
    page: number = 0,
    size: number = 20,
    sort: string = "name,asc",
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page)
      .set("size", size)
      .set("sort", sort);

    if (search !== "") {
      params = params.set("search", search);
    }

    return this.http
      .get<any>(`${baseUrl}/manager/owner/getAll`, { params })
      .pipe(
        map((response) => response.data), // Page<ChiefDTO>
        catchError((error) => throwError(() => error)),
      );
  }

  getManagerPortalPercentage(managerId: string): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/manager/getPercentages/${managerId}`)
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getManagerWithChiefIdPaginated(
    chiefId: string,
    page = 0,
    size = 5,
  ): Observable<any> {
    return this.http.get<any>(
      `${baseUrl}/manager/getManagersByChiefIdPaginated/${chiefId}?page=${page}&size=${size}`,
    );
  }

  getManagerBalanceByPortal(portalId: any, managerId: any): Observable<any[]> {
    return this.http.get<any[]>(
      `${baseUrl}/manager/getManagerBalanceByPortal/${portalId}/${managerId}`,
    );
  }
}
