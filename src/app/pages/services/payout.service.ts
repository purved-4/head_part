import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import baseUrl from './helper';

export interface Payout {
  id: number;
  userId: number;
  beneficiaryId: number | null;
  amount: string;
  transferAmount: string;
  commission: string;
  status: string;
  transferType: string;
  providerOrderId: string;
  utrNumber: string | null;
  failureReason: string | null;
  rawResponse: string;
  rewardRate: string | null;
  rewardAmount: string | null;
  rewardStatus: string;
  rewardCreditedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export interface PaginatedPayoutResponse {
  success: boolean;
  error?: string;
  payouts: Payout[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export interface CompletedSummary {
  success: boolean;
  error?: string;
  totalAmount: number;
  totalRewardAmount: number;
  totalCombined: number;
  completedCount: number;
}

export interface PayoutListParams {
  fromDate?: string; // yyyy-MM-dd
  toDate?: string;   // yyyy-MM-dd
  page?: number;      // 0-indexed
  size?: number;
  comPartId?: any;
}

@Injectable({ providedIn: 'root' })
export class PayoutService {
  // Adjust base if your backend has a context-path (e.g. '/api')
 
  constructor(private http: HttpClient) {}

  /** GET /withdraw/{payoutId}/local */
  getLocalPayout(payoutId: number, comPartId: any): Observable<ApiResponse<{ payout: Payout }>> {
    return this.http.get<ApiResponse<{ payout: Payout }>>(
      `${baseUrl}/withdraw/${payoutId}/local?comPartId=${comPartId}`
    );
  }

  /**
   * GET /withdrawals/completed-unrewarded
   * Paginated, sorted by createdAt DESC on the backend.
   * fromDate/toDate optional — omit both to get plain paginated findAll().
   */
  getPayoutList(params: PayoutListParams): Observable<PaginatedPayoutResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 0))
      .set('size', String(params.size ?? 10))
      .set('comPartId', String(params.comPartId ?? ''));
      // cache-buster — prevents any browser/proxy caching from
      // reusing a stale response
     

    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);

    return this.http.get<PaginatedPayoutResponse>(
      `${baseUrl}/withdrawals/completed-unrewarded`,
      { params: httpParams }
    );
  }

  /** GET /withdrawals/completed-summary — sum of amount + rewardAmount for COMPLETED payouts */
  getCompletedSummary(comPartId: any): Observable<CompletedSummary> {
    return this.http.get<CompletedSummary>(
      `${baseUrl}/withdrawals/completed-summary?comPartId=${comPartId}`
    );
  }

   getCompletedPayins(comPartId: any): Observable<CompletedSummary> {
    return this.http.get<CompletedSummary>(
      `${baseUrl}/payin/completed-summary?comPartId=${comPartId}`
    );
  }

  /** POST /withdraw/{payoutId}/reward  body: { rate } */
  applyReward(payoutId: number, comPartId: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${baseUrl}/withdraw/${payoutId}/reward?comPartId=${comPartId}`,{}
     
    );
  }


   applyBulk(comPartId: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${baseUrl}/withdraw/reward/bulk?comPartId=${comPartId}`,{}
     
    );
  }
  
}