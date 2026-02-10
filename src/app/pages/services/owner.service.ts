import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import baseUrl from './helper';

@Injectable({
  providedIn: 'root'
})
export class OwnerService {

  constructor(private http: HttpClient) {}


  getOwnerBalance(): Observable<number> {
    return this.http.get<any>(`${baseUrl}/owner/getBalance`).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }


  acceptBankFund(id: string): Observable<void> {
    return this.http.patch<any>(`${baseUrl}/owner/bank/${id}/accept`, {}).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }

  rejectBankFund(id: string, reason: string, file: File): Observable<void> {
    const formData = new FormData();
    formData.append('reason', reason);
    formData.append('file', file);

    return this.http.patch<any>(
      `${baseUrl}/owner/bank/${id}/reject`,
      formData
    ).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }


  acceptUpiFund(id: string): Observable<void> {
    return this.http.patch<any>(`${baseUrl}/owner/upi/${id}/accept`, {}).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }

  rejectUpiFund(id: string, reason: string, file: File): Observable<void> {
    const formData = new FormData();
    formData.append('reason', reason);
    formData.append('file', file);

    return this.http.patch<any>(
      `${baseUrl}/owner/upi/${id}/reject`,
      formData
    ).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }


  acceptPayout(id: string, accountId?: string): Observable<void> {
    let params = new HttpParams();
    if (accountId) {
      params = params.set('accountId', accountId);
    }

    return this.http.patch<any>(
      `${baseUrl}/owner/payout/${id}/accept`,
      {},
      { params }
    ).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }

  rejectPayout(id: string, reason: string, file: File): Observable<void> {
    const formData = new FormData();
    formData.append('reason', reason);
    formData.append('file', file);

    return this.http.patch<any>(
      `${baseUrl}/owner/payout/${id}/reject`,
      formData
    ).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }


  logoutUser(userId: string, password: string): Observable<void> {
    return this.http.post<any>(
      `${baseUrl}/owner/logout/user/${userId}`,
       password 
    ).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }

  logoutAllUsers(password: string): Observable<void> {
    return this.http.post<any>(
      `${baseUrl}/owner/logout/all`,
       password 
    ).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }


  getWebsitePercentages(websiteId: string): Observable<any> {
    return this.http.get<any>(
      `${baseUrl}/owner/getPercentages/${websiteId}`
    ).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }


  getAllLoginedUsers(): Observable<any[]> {
    return this.http.get<any>(
      `${baseUrl}/work-reports/active-users`
    ).pipe(
      map(res => res.data),
      catchError(this.handleError)
    );
  }


  private handleError(error: any) {
    console.error('OwnerService Error:', error);
    return throwError(() => error);
  }
}
