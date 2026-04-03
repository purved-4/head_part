import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class BranchService {
  constructor(private http: HttpClient) {}

  addBranch(data: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/branch/createBranch`, data);
  }

  getAllBranchs(): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/branch/getAll`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getBranchById(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/branch/getBranchById/${id}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getBranchByUserId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getBranchsByUserId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  // getbranchByAgentId(id: any): Observable<any[]> {
  //   return this.http
  //     .get<any[]>(`${baseUrl}/branch/getmanagersBychiefId/${id}`)
  //     .pipe(
  //       map((response: any) => response.data),
  //       catchError((error) => throwError(error))
  //     );
  // }

  toggleChiefStatus(agentId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/branch/changeStatus/${agentId}`,
      {},
    );
  }

  toggleChiefUserStatus(agentId: string, userId: any): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/branch/changeStatusByUser/${agentId}/${userId}`,
      {},
    );
  }

  addUserToBranch(payload: any, userId: string): Observable<any> {
    return this.http.post(`${baseUrl}/allot-branch/${userId}`, payload);
  }

  getUsersByBranchId(userId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getUsersByBranchId/${userId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  //   getbranchsByAgentId(agentId: string): Observable<any[]> {
  //   return this.http
  //     .get<any[]>(`${baseUrl}/branch/getmanagersBychiefId/${agentId}`)
  //     .pipe(
  //       map((response: any) => response.data),
  //       catchError((error) => throwError(error))
  //     );
  // }

  getPortalByBranchId(agentId: string, paymentMethod?: any): Observable<any[]> {
    let params: any = {};

    if (paymentMethod) {
      params.paymentMethod = paymentMethod;
    }
    return this.http
      .get<
        any[]
      >(`${baseUrl}/branch/getAllBranchsWithPortalsById/${agentId}`, { params })
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getBranchWithHeadId(headId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getBranchsListByUserId/${headId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  updateBranch(data: any): Observable<any[]> {
    return this.http.patch<any[]>(`${baseUrl}/branch/updateBranch`, data).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getLogoutStatus(userId: any) {
    return this.http
      .get<any[]>(`${baseUrl}/latest-before-today/${userId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  changeManagerPortalStatus(portalId: any, branchId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/branch/changeStatus/${branchId}/${portalId}`,
      {},
    );
  }

  getBranchByPortalId(portalId: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getBranchsWithPortals/${portalId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllBranchByOwner(
    search: string = "",
    page: number = 0,
    size: number = 20,
  ): Observable<any> {
    let params = new HttpParams().set("page", page).set("size", size);

    if (search && search.trim() !== "") {
      params = params.set("search", search.trim());
    }
    return this.http
      .get<any>(`${baseUrl}/branch/owner/getAll`, { params })
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getBranchPortalPercentage(branchId: string): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/branch/getPercentages/${branchId}`)
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getBranchWithUserIdPaginated(userId: string, page: number, size: number) {
    return this.http.get<any>(
      `${baseUrl}/branch/getBranchsListByUserIdPaginated/${userId}?page=${page}&size=${size}`,
    );
  }

  toggleDashbaordTopup(branchId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/branch/${branchId}/toggle-topup`,
      {},
    );
  }
}
