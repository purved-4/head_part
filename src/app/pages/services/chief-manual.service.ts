import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";
import { map, Observable } from "rxjs";
import { Agent } from "http";

@Injectable({
  providedIn: "root",
})
export class ChiefManualService {
  constructor(private http: HttpClient) {}

  changeManualStatus(chiefId: string, portalId: string) {
    return this.http.patch(
      `${baseUrl}/chief/changeManualStatus/${chiefId}/${portalId}`,
      {},
    );
  }

  performManualAction(chiefId: string, portalId: string, payload: any) {
    return this.http.post(
      `${baseUrl}/manual/performManualAction/${chiefId}/${portalId}`,
      payload,
    );
  }

  getManualStatus(chiefId: any, portalId: any) {
    return this.http
      .get(`${baseUrl}/manual/getManualStatus/${chiefId}/${portalId}`)
      .pipe(map((response: any) => response.data));
  }

  getBranchsByChiefManual(chiefId: any) {
    return this.http
      .get(`${baseUrl}/manual/getBranchsListByUserId/${chiefId}`)
      .pipe(map((response: any) => response.data));
  }

  getManualByChiefManualPending(chiefId: any, status: any) {
    return this.http
      .get(`${baseUrl}/manual/getManualActions/${chiefId}/${status}`)
      .pipe(map((response: any) => response.data));
  }

  approveManual(id: string, payload: any) {
    return this.http.post(`${baseUrl}/manual/approve/${id}`, payload);
  }

  rejectManual(id: string) {
    return this.http.post(`${baseUrl}/manual/reject/${id}`, {});
  }
}
