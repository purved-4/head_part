import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";
import { catchError, map, Observable, throwError } from "rxjs";

export interface PortalPercentage {
  payinPercentage: number;
  payoutPercentage: number;
  fttPercentage: number;
}

// Updates every Manager under chiefId. Caller must be CHIEF.
export interface BulkManagerUpdatePayload {
  chiefId: string;
  percentage: PortalPercentage;
}

// Updates every Head under parentId. Caller can be CHIEF or MANAGER.
export interface BulkHeadUpdatePayload {
  parentId: string;
  parentType: "CHIEF" | "MANAGER";
  percentage: PortalPercentage;
}

// Updates every Branch under headId. Caller must be HEAD.
export interface BulkBranchUpdatePayload {
  headId: string;
  percentage: PortalPercentage;
}

@Injectable({
  providedIn: "root",
})
export class BulkUpdateService {
  constructor(private http: HttpClient) {}

  /** Caller: CHIEF. Cascades new percentage to every Manager under chiefId. */
  updateBulkManager(payload: BulkManagerUpdatePayload): Observable<any> {
    return this.http.post(`${baseUrl}/bulk/manager`, payload).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  /** Caller: CHIEF or MANAGER. Cascades new percentage to every Head under parentId. */
  updateBulkHead(payload: BulkHeadUpdatePayload): Observable<any> {
    return this.http.post(`${baseUrl}/bulk/head`, payload).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  /** Caller: HEAD. Cascades new percentage to every Branch under headId. */
  updateBulkBranch(payload: BulkBranchUpdatePayload): Observable<any> {
    return this.http.post(`${baseUrl}/bulk/branch`, payload).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }
  getAllResolvedNotification(createdBy: string): Observable<any> {
    return this.http
      .get(`${baseUrl}/percentage-change-request/${createdBy}/latest`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }
  getReslovedNotificationById(requestId: any): Observable<any> {
    return this.http
      .get(`${baseUrl}/percentage-change-request/${requestId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }
  
}