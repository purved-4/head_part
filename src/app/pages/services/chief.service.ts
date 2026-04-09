import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";
// import { CreateAgentRequest } from "../owner/chief/add-chief/add-chief.component";

export interface Agent {
  id: string;
  name: string;
  mobile: string;
  email: string;
  info?: string;
  active?: boolean;
  createdBy?: string;
}

@Injectable({
  providedIn: "root",
})
export class ChiefService {
  constructor(private http: HttpClient) {}

  addChief(agent: any): Observable<Agent> {
    return this.http.post<Agent>(`${baseUrl}/chief/createChief`, agent);
  }

  getChiefsListByUserId(
    user: any,
    page?: any,
    pagesize?: any,
  ): Observable<Agent[]> {
    return this.http
      .get<Agent[]>(`${baseUrl}/chief/getChiefsListByUserId/${user}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }
  getChiefsByUserId(user: any): Observable<Agent[]> {
    return this.http
      .get<Agent[]>(`${baseUrl}/chief/getChiefsByUserId/${user}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getChiefsById(chiefId: any): Observable<any> {
    return this.http
      .get<Agent[]>(`${baseUrl}/chief/getChiefById/${chiefId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getUsersByChiefId(agentId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/chief/getUsersByChiefId/${agentId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  addUserToChief(payload: any, userId: string): Observable<any> {
    return this.http.post(`${baseUrl}/allot-chief/${userId}`, payload);
  }

  toggleChiefStatus(agentId: string): Observable<Agent> {
    return this.http.patch<Agent>(
      `${baseUrl}/chief/changeStatus/${agentId}`,
      {},
    );
  }

  toggleChiefTransactionStatus(agentId: string): Observable<Agent> {
    return this.http.patch<Agent>(
      `${baseUrl}/chief/changeTransaction/${agentId}`,
      {},
    );
  }

  toggleChiefUserStatus(agentId: string, userId: any): Observable<Agent> {
    return this.http.patch<Agent>(
      `${baseUrl}/chief/changeStatusByUser/${agentId}/${userId}`,
      {},
    );
  }

  getAllPortalsByChiefId(agentId: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/chief/getPortalsByChiefId/${agentId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  updateChief(agentData: any): Observable<any[]> {
    return this.http
      .patch<any[]>(`${baseUrl}/chief/updateChief`, agentData)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(error)),
      );
  }

  changeChiefPortalStatus(portalId: any, chiefId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/chief/changeStatus/${chiefId}/${portalId}`,
      {},
    );
  }

  getAllChiefByOwner(
    search: string | null,
    page: number = 0,
    size: number = 20,
    sort: string = "name,asc",
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page)
      .set("size", size)
      .set("sort", sort);

    if (search) {
      params = params.set("search", search);
    }

    return this.http.get<any>(`${baseUrl}/chief/owner/getAll`, { params }).pipe(
      map((response) => response.data), // Page<ChiefDTO>
      catchError((error) => throwError(() => error)),
    );
  }

  getChiefPortalPercentage(chiefId: string): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/chief/getPercentages/${chiefId}`)
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  addChiefDomain(chiefId: string, domain: any): Observable<any> {
    return this.http
      .post<any>(`${baseUrl}/chief/${chiefId}/domains?domain=${domain}`, {})
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  updateChiefDomain(domainId: string, domain: any): Observable<any> {
    return this.http
      .put<any>(`${baseUrl}/chief/domains/${domainId}?domainName=${domain}`, {})
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getChiefDomain(chiefId: string): Observable<any> {
    return this.http.get<any>(`${baseUrl}/chief/${chiefId}/domains`).pipe(
      map((response) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  deleteChiefDomain(domainId: any): Observable<any> {
    return this.http.delete<any>(`${baseUrl}/chief/domains/${domainId}`).pipe(
      map((response) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  getPortalsByChiefIDPaginated(chiefId: any, page?: number, size?: number) {
    let params: any = {};

    if (page !== undefined && page !== null) {
      params.page = page;
    }

    if (size !== undefined && size !== null) {
      params.size = size;
    }

    return this.http.get<any>(
      `${baseUrl}/chief/getPortalsByChiefIdPaginated/${chiefId}`,
      { params },
    );
  }

  getChiefBalanceByPortal(portalId: any, chiefId: any): Observable<any[]> {
    return this.http.get<any[]>(
      `${baseUrl}/chief/getChiefBalanceByPortal/${portalId}/${chiefId}`,
    );
  }
}
