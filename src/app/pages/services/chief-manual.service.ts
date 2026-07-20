import { HttpClient, HttpParams } from "@angular/common/http";
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

performManualAction(
    promoCode: string | null,
    affiliateLink: any,
    payload: any,
  ) {
    let params = new HttpParams();

    if (promoCode?.trim()) {
      params = params.set("promoCode", promoCode);
    }

    if (affiliateLink?.trim()) {
      params = params.set("affiliateLink", affiliateLink);
    }

    return this.http.post(`${baseUrl}/manual/performManualAction`, payload, {
      params,
    });
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

  approveManual(id: string, headId: any, payload: any) {
    return this.http.post(
      `${baseUrl}/manual/approve/${id}?headId=${headId}`,
      payload,
    );
  }

  rejectManual(id: string) {
    return this.http.post(`${baseUrl}/manual/reject/${id}`, {});
  }
}