import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";
import { catchError, Observable, throwError, map } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class WebsiteService {
  constructor(private http: HttpClient) {}

  getByWebsiteId(websiteId: string): Observable<any> {
    return this.http.get(`${baseUrl}/websites/getById/${websiteId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error))
    );
  }

  generateUniqueId(): Observable<{ uniqueId: string }> {
    return this.http
      .get<{ uniqueId: string }>(`${baseUrl}/websites/generateUniqueId`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

  // Generate token key
  generateToken(): Observable<{ token: string }> {
    return this.http
      .get<{ uniqueId: string }>(`${baseUrl}/websites/generateTokenKey`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }

  // Add new site
  addSite(site: any): Observable<any> {
    return this.http.post(`${baseUrl}/websites/create`, site);
  }

  // Optional: fetch all sites
  getById(userId: any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/websites/getById/${userId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error))
    );
  }
  getAllWebsite(): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/websites/getAll`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error))
    );
  }

  getAllWebsiteByAdminId(id:any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/websites/getWebsitesByUserId/${id}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error))
    );
  }

  deleteSite(userId: any): Observable<any[]> {
    return this.http.delete<any[]>(`${baseUrl}/websites/delete/${userId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error))
    );
  }

  updateSite(data: any): Observable<any[]> {
    return this.http.patch<any[]>(`${baseUrl}/websites/update`, data).pipe(
      map((response: any) => response),
      catchError((error) => throwError(error))
    );
  }

  /// website users api 


   addUserToWebsite(payload: any, websiteId: string): Observable<any> {
    return this.http.post(`${baseUrl}/allot-website/${websiteId}`, payload);
  }


   getUsersByWebsiteId(websiteId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/websites/getUsersByWebsiteId/${websiteId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }



  /// WEBSITE QUESTION APIS


  addQuestionToWebsite(questions: any): Observable<any> {
    return this.http.post(`${baseUrl}/messages/create`, questions);
  }

  updateQuestionToWebsite(questions: any): Observable<any> {
    return this.http.patch(`${baseUrl}/messages/update`, questions);
  }

  deleteQuestionToWebsite(messageId: any): Observable<any> {
    return this.http.delete(`${baseUrl}/messages/delete/${messageId}`);
  }

  getQuestionWithWebsiteId(websiteId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/messages/getByWebsite/${websiteId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error))
      );
  }



  // website payout time apis 

  addpayoutTime(questions: any): Observable<any> {
    return this.http.post(`${baseUrl}/processing-time/add`, questions);
  }

  updatepayoutTime(id:any,data: any): Observable<any> {
    return this.http.patch(`${baseUrl}/processing-time`, data);
  }

  getpayoutTimeWithWebsiteId(websiteId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${baseUrl}/processing-time/${websiteId}`)
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(error))
      );
  }

  deletepayoutTime(id: any): Observable<any> {
    return this.http.delete(`${baseUrl}/payout-times/delete/${id}`);
  }





}
