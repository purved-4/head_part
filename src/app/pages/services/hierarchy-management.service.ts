import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class HierarchyManagementService {
  // <-- yaha apna API base URL daal

  constructor(private http: HttpClient) {}

  // Get Branch By Head ID
  getBranchByHeadId(headId: string): Observable<any> {
    return this.http.get(`${baseUrl}/branch/getBranchByHeadId/${headId}`);
  }

  // Get Head By Manager ID
  getHeadByManagerId(managerId: string): Observable<any> {
    return this.http.get(`${baseUrl}/head/getHeadByManagerId/${managerId}`);
  }

  // Get Managers By Chief ID (Paginated)
  getManagersByChiefIdPaginated(
    chiefId: string,
    page: number = 0,
    size: number = 10,
  ): Observable<any> {
    let params = new HttpParams().set("page", page).set("size", size);

    return this.http.get(
      `${baseUrl}/manager/getManagersByChiefIdPaginated/${chiefId}`,
      { params },
    );
  }

  // Get Branch By Chief ID
  getBranchByChiefId(chiefId: string): Observable<any> {
    return this.http.get(`${baseUrl}/branch/getBranchByChiefId/${chiefId}`);
  }
}
