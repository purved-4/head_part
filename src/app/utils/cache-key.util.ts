import { HttpRequest, HttpParams } from '@angular/common/http';

export function buildCacheKey(req: HttpRequest<any>): string {
  const method = req.method.toUpperCase();
  const url = req.url.replace(/\/+$/, '');

  const params = normalizeParams(req.params);

  return `${method}::${url}::${params}`;
}

function normalizeParams(params: HttpParams): string {
  const keys = params.keys().sort();

  if (!keys.length) return '';

  return keys
    .map((key) => `${key}=${params.get(key)}`)
    .join('&');
}




















// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, catchError, map, throwError } from 'rxjs';
// import { HttpCacheService } from '../cache/http-cache.service';

// @Injectable({ providedIn: 'root' })
// export class BankService {
//   constructor(
//     private http: HttpClient,
//     private cache: HttpCacheService
//   ) {}

//   // ✅ Normal cached call
//   getBankDataWithEntityIdAndPortalId(
//     id: string,
//     portalId: string
//   ): Observable<any> {
//     return this.http
//       .get<any>(
//         `${baseUrl}/banks/getAllByEntityIdAndPortalId/${id}/${portalId}`
//       )
//       .pipe(
//         map((res: any) => res.data),
//         catchError((err) => throwError(() => err))
//       );
//   }

//   // ✅ REAL FORCE REFRESH (BEST PRACTICE)
//   refreshBankData(id: string, portalId: string): Observable<any> {
//     const tag = `BANKS:${id}:${portalId}`;

//     // 1. remove old cache
//     this.cache.invalidateByTag(tag);

//     // 2. make fresh API call (will auto-cache again)
//     return this.getBankDataWithEntityIdAndPortalId(id, portalId);
//   }
// }




// Normal cached usage
// this.bankService
//   .getBankDataWithEntityIdAndPortalId(this.id, this.portalId)
//   .subscribe((data) => {
//     this.bankData = data;
//   });


//   Real force refresh usage
// this.bankService
//   .refreshBankData(this.id, this.portalId)
//   .subscribe((data) => {
//     this.bankData = data;
//   });



//   First call
// Component → API → Cache saved
// Second call
// Component → Cache → No API call
// Refresh call
// Component → invalidate → API → new cache