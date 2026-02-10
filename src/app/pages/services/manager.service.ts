import { HttpClient } from "@angular/common/http";
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
    return this.http
      .get<any[]>(`${baseUrl}/manager/getManagerById/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

    getManagerByUserId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/manager/getManagersByUserId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

  getManagersByAgentId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/manager/getManagersByChiefId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

  toggleManagerStatus(agentId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/manager/changeStatus/${agentId}`,
      {}
    );
  }

   toggleManagerUserStatus(agentId: string, userId: any): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/manager/changeStatusByUser/${agentId}/${userId}`,
      {}
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
        catchError((error) => throwError(error))
      );
  }
     getManagersByChiefId(agentId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/manager/getManagersByChiefId/${agentId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

   getWebsiteByChiefId(agentId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/manager/getAllManagersWithWebsitesById/${agentId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

  updateManager(data: any): Observable<any[]> {
    return this.http
      .patch<any[]>(`${baseUrl}/manager/updateManager`,data)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }


  changeManagerWebsiteStatus(websiteId:any , ManagerId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/manager/changeStatus/${ManagerId}/${websiteId}`,
      {}
    );
  }
  
}
