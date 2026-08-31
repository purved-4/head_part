import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import baseUrl from './helper';

export interface WithdrawalListParams {
  page?: number;
  limit?: number;
  status?: string;        // PENDING | PROCESSING | COMPLETED | FAILED | REVERSED | CANCELLED
  transferType?: string;  // IMPS | NEFT | RTGS | IFT
  userId?: number;        // admin-level keys only
  fromDate?: string;      // ISO 8601, e.g. "2026-03-01"
  toDate?: string;        // ISO 8601, e.g. "2026-03-31"
}

@Injectable({
  providedIn: 'root'
})
export class VyaaparService {

  constructor(
    private http: HttpClient,
  ) { }

 


   postWithdrawComPart(payload: any, comPartId: any, portalId:any) {
    if(portalId==null){
          return this.http.post(`${baseUrl}/withdraw?comPartId=${comPartId}`, payload);

    }
    return this.http.post(`${baseUrl}/withdraw?comPartId=${comPartId}&portalId=${portalId}`, payload);
  }

  // GET /api/external/payout-status?payoutId=xxx
 getWithdrawStatus(id:any, comPartId:any) {
    return this.http.get(`${baseUrl}/withdraw/${id}/status?comPartId=${comPartId}`);
  }

  // GET /api/external/withdrawals?page=&limit=&status=&transferType=&fromDate=&toDate=
  getWithdrawals(filters?: WithdrawalListParams, comPartId?: any) {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    if (comPartId) {
      params = params.set('comPartId', comPartId.toString());
    }

    return this.http.get(`${baseUrl}/withdrawals`, { params });
  }

  getBeneficiaries() {
    return this.http.get(`${baseUrl}/beneficiaries`);
  }

  getBeneficiariesbyId(id: any) {
    return this.http.get(`${baseUrl}/beneficiaries/${id}`);
  }

  submitShree(data: any) {
    return this.http.post(`${baseUrl}/paytouch/withdraw`, data)
  }

}