import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import baseUrl from './helper';

@Injectable({
  providedIn: 'root'
})
export class VyaaparService {

  constructor(
    private http : HttpClient,

  ) { }

  postWithdraw(payload:any) {
    return this.http.post(`${baseUrl}/withdraw`,payload);
  }

  getWithdrawStatus(id:any){
    return this.http.get(`${baseUrl}/withdraw/${id}/status`);
  }

  getWithdrawals(){
    return this.http.get(`${baseUrl}/withdrawals`);
  }

  getBeneficiaries(){
    return this.http.get(`${baseUrl}/beneficiaries`);
  }

  getBeneficiariesbyId(id:any){
    return this.http.get(`${baseUrl}/beneficiaries/${id}`);
  }


  submitShree(data:any){
    return this.http.post(`${baseUrl}/paytouch/withdraw`,data)
  }

}

