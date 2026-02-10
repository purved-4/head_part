import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

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

  getChiefsListByUserId(user: any): Observable<Agent[]> {
    return this.http
      .get<Agent[]>(`${baseUrl}/chief/getChiefsListByUserId/${user}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }
  getChiefsByUserId(user: any): Observable<Agent[]> {
    return this.http
      .get<Agent[]>(`${baseUrl}/chief/getChiefsByUserId/${user}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

   getChiefsById(chiefId: any): Observable<Agent[]> {
    return this.http
      .get<Agent[]>(`${baseUrl}/chief/getChiefById/${chiefId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

 
  getUsersByChiefId(agentId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/chief/getUsersByChiefId/${agentId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

  addUserToChief(payload: any, userId: string): Observable<any> {
    return this.http.post(`${baseUrl}/allot-chief/${userId}`, payload);
  }

  toggleChiefStatus(agentId: string): Observable<Agent> {
    return this.http.patch<Agent>(
      `${baseUrl}/chief/changeStatus/${agentId}`,
      {}
    );
  }

  toggleChiefUserStatus(agentId: string, userId: any): Observable<Agent> {
    return this.http.patch<Agent>(
      `${baseUrl}/chief/changeStatusByUser/${agentId}/${userId}`,
      {}
    );
  }

   getAllWebsitesByChiefId(agentId:any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/chief/getWebsitesByChiefId/${agentId}`).pipe(
      map((response: any) => response.data),
      catchError(error => throwError(error))
    );
  }

   updateChief(agentData:any): Observable<any[]> {
    return this.http.patch<any[]>(`${baseUrl}/chief/updateChief`,agentData).pipe(
      map((response: any) => response),
      catchError(error => throwError(error))
    );
  }

  changeChiefWebsiteStatus(websiteId:any , chiefId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/chief/changeStatus/${chiefId}/${websiteId}`,
      {}
    );
  }

  
}
