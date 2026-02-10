import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: 'root'
})
export class BranchService {

 constructor(private http: HttpClient) {}


  addBranch(data: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/branch/createBranch`, data);
  }

  getAllBranchs(): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getAll`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

  getBranchById(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getBranchById/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

    getBranchByUserId(id: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getBranchsByUserId/${id}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
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
      {}
    );
  }

   toggleChiefUserStatus(agentId: string, userId: any): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/branch/changeStatusByUser/${agentId}/${userId}`,
      {}
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
        catchError((error) => throwError(error))
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

   getWebsiteByBranchId(agentId: string, paymentMethod?: any): Observable<any[]> {
     let params: any = {};

  if (paymentMethod) {
    params.paymentMethod = paymentMethod;
  }
    return this.http
      .get<any[]>(`${baseUrl}/branch/getAllBranchsWithWebsitesById/${agentId}`,{ params })
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

   getBranchWithHeadId(headId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getBranchsListByUserId/${headId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

   

  updateBranch(data: any): Observable<any[]> {
    return this.http
      .patch<any[]>(`${baseUrl}/branch/updateBranch`,data)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }


  getLogoutStatus(userId:any){
    return this.http
      .get<any[]>(`${baseUrl}/latest-before-today/${userId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

  changeManagerWebsiteStatus(websiteId:any , branchId: string): Observable<any> {
    return this.http.patch<any>(
      `${baseUrl}/branch/changeStatus/${branchId}/${websiteId}`,
      {}
    );
  }

   getBranchByWebsiteId(websiteId: any): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/branch/getBranchsWithWebsites/${websiteId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

}
