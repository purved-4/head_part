import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import baseUrl from './helper';

// Backend request body -> sirf ye 2 field jaate hai

// Backend request body -> sirf ye 2 field jaate hai
export interface CreatePayinRequest {
  amount: number;
  customerName: string;
  comPartId: string;  // <-- naya field, backend me bhi add kiya hai
}
 
// Backend "Payin" entity jaisa hi response (create / local list / local one me yahi shape aata hai)
export interface PayinApiResponse {
  id: string;
  merchantOrderId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  customerName: string;
  paymentUrl: string;
  status: string;
  payinStatus: boolean;
  utr: string | null;
  paidAt: string | null;
  gatewayCreatedAt: string | null;
  expiresAt: string | null;
  createdDate: string;
  updatedDate: string;
}
 
// Backend "GET /status/{merchantOrderId}" ka response (live gateway status)
export interface PayinStatusApiResponse {
  success: boolean;
  paid: boolean;
  status: string;
  orderId: string;
  transactionId: string;
  amount: number;
  currency: string;
  utr: string | null;
  paidAt: string | null;
  createdAt: string;
  expiresAt: string;
  comPartId: string;
}

// Backend "Payin" entity jaisa hi response (create / local list / local one me yahi shape aata hai)
export interface PayinApiResponse {
  id: string;
  merchantOrderId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  customerName: string;
  paymentUrl: string;
  status: string;
  payinStatus: boolean;
  utr: string | null;
  paidAt: string | null;
  gatewayCreatedAt: string | null;
  expiresAt: string | null;
  createdDate: string;
  updatedDate: string;
    comPartId: string;
    rate:number;
    rewardAmount:number;

}

// Backend "GET /status/{merchantOrderId}" ka response (live gateway status)
export interface PayinStatusApiResponse {
  success: boolean;
  paid: boolean;
  status: string;
  orderId: string;
  transactionId: string;
  amount: number;
  currency: string;
  utr: string | null;
  paidAt: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface PayinLocalFilters {
  orderId?: string;
  customerName?: string;
  fromDate?: string;
  toDate?: string;
  comPartId: string;  // <-- naya field
  status?: 'ALL' | 'PENDING' | 'COMPLETED';
}
 
// Spring ka Page<T> jaisa hi response shape
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // current page (0-based)
  size: number;      // page size
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class PayinApiService {

  // Agar environment file use karte ho to environment.apiBaseUrl se replace kar dena
 
  constructor(private http: HttpClient) {}

  create(payload: CreatePayinRequest): Observable<PayinApiResponse> {
    return this.http.post<PayinApiResponse>(`${baseUrl}/payin/create`, payload);
  }

  getAllLocal(): Observable<PayinApiResponse[]> {
    return this.http.get<PayinApiResponse[]>(`${baseUrl}/payin/local`);
  }

  getLocalOne(merchantOrderId: string): Observable<PayinApiResponse> {
    return this.http.get<PayinApiResponse>(`${baseUrl}/payin/local/${merchantOrderId}`);
  }

  // Gateway se live status check + local db sync (backend khud kar deta hai)
  refreshStatus(merchantOrderId: string): Observable<PayinStatusApiResponse> {
    return this.http.get<PayinStatusApiResponse>(`${baseUrl}/payin/status/${merchantOrderId}`);
  }

   getLocalPaged(
    filters: PayinLocalFilters,
    page: number,
    size: number,
    sort: string = 'createdDate,desc'
  ): Observable<PageResponse<PayinApiResponse>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);
 
    if (filters.orderId?.trim()) {
      params = params.set('orderId', filters.orderId.trim());
    }
    if (filters.customerName?.trim()) {
      params = params.set('customerName', filters.customerName.trim());
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
  if (filters.comPartId) {
      params = params.set('comPartId', filters.comPartId);
    }
    if (filters.fromDate) {
  params = params.set('fromDate', filters.fromDate + 'T00:00:00');
}
if (filters.toDate) {
  params = params.set('toDate', filters.toDate + 'T23:59:59');
}
    return this.http.get<PageResponse<PayinApiResponse>>(`${baseUrl}/payin/local`, { params });
  }
 
 
}
