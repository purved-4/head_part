import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

import { HttpClient, HttpParams } from "@angular/common/http";
@Injectable({
  providedIn: "root",
})
export class AnonymousService {
  constructor(private http: HttpClient) {}

  sendWebhook(
    portalId: string,
    payload: any,
    snap: any,
    currency: any,
    userId: any,
    token: any,
    signature: any,
    turnstileToken: string,
  ): Observable<string> {
    const formData = new FormData();
    let params = new HttpParams();

    if (payload) {
      formData.append(
        "payload",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
    }
    if (snap) {
      formData.append("snap", snap);
    }
    if (currency) {
      params = params.set("currency", currency);
    }
    if (token != null) {
      params = params.set("token", token);
    }

    if (signature != null) {
      params = params.set("sig", signature);
    }

    if (userId != null) {
      params = params.set("userId", userId);
    }
    if (turnstileToken != null) {
      params = params.set("cf-turnstile-response", turnstileToken);
    }

    return this.http.post(
      `${baseUrl}/anonymous/webhook/post/${portalId}`,
      formData,
      {
        responseType: "text",
        params,
      },
    );
  }
  getUpiDetailsByAmountAnonymous(
    portalId: any,
    amount?: any,
    currency?: any,
    userId?: string,
    token?: any,
    sig?: any,
    isSkip?: any,
    reason?: any,
  ) {
    let params = new HttpParams();

    if (amount != null && amount > 0) {
      params = params.set("amount", amount);
    }
    // ssAssets

    if (currency) {
      params = params.set("currency", currency);
    }

    if (userId != null) {
      params = params.set("userId", userId);
    }

    if (token != null) {
      params = params.set("token", token);
    }

    if (sig != null) {
      params = params.set("sig", sig);
    }

    if (isSkip != null) {
      params = params.set("isSkip", isSkip);
    }

    if (reason != null) {
      params = params.set("reason", reason);
    }

    return this.http
      .get(`${baseUrl}/anonymous/getUpiDetailsByAmount/${portalId}`, {
        params,
      })
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }
  getBankDetailsByAmountAnonymous(
    portalId: any,
    amount?: any,
    currency?: any,
    userId?: string,
    token?: any,
    sig?: any,
    isSkip?: any,
    reason?: any,
  ) {
    let params = new HttpParams();

    if (amount != null && amount > 0) {
      params = params.set("amount", amount);
    }

    if (currency != null) {
      params = params.set("currency", currency);
    }

    if (userId != null) {
      params = params.set("userId", userId);
    }

    if (token != null) {
      params = params.set("token", token);
    }

    if (sig != null) {
      params = params.set("sig", sig);
    }

    if (isSkip != null) {
      params = params.set("isSkip", isSkip);
    }

    if (reason != null) {
      params = params.set("reason", reason);
    }

    return this.http
      .get(`${baseUrl}/anonymous/getBankDetailsByAmount/${portalId}`, {
        params,
      })
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  verifyLinkWithTokenAndSignature(token: any, sig: any) {
    return this.http
      .get<any>(`${baseUrl}/anonymous/verify?token=${token}&sig=${sig}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }
  removeAssignment(token: string, sig: any) {
    let params = new HttpParams();

    if (token != null) {
      params = params.set("token", token);
    }
    if (sig != null) {
      params = params.set("sig", sig);
    }

    return this.http.post<any>(
      `${baseUrl}/anonymous/remove-assignment`,
      token,
      { params },
    );
  }
  uploadAnonymousOcr(
    file: File,
    portalId: string,
    tokenId: any,
    sig: any,
  ): Observable<any> {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("portalId", portalId);
    formData.append("token", tokenId);
    formData.append("sig", sig);
    return this.http.post(`${baseUrl}/ocr/anonymous`, formData);
  }

  getFile(
  token: string,
  sig: any,
  qrImagePath: string
) {
  let params = new HttpParams();

  if (token) {
    params = params.set('token', token);
  }

  if (sig) {
    params = params.set('sig', sig);
  }

  if (qrImagePath) {
    params = params.set('fileId', qrImagePath);
  }

  return this.http.get(
    `${baseUrl}/anonymous/getFile`,
    {
      params,
      responseType: 'blob'
    }
  );
}

 
 

 



// ------
addFavourite(
    token: string,
  sig: any,
  userId: string,
  payinId: string,
  payinType: string,
   portalId: string
): Observable<any> {

  return this.http.post(
    `${baseUrl}/anonymous/favourites/add`,
    {
      userId,
      payinId,
      payinType,
       portalId
    },
    {
      params: {
        token,
        sig,
        userId,
        payinId,
        payinType,
          portalId
      }
    }
  );

}

getUserFavourites(
   token: string,
  sig: any,
  userId: string,
  type?: 'BANK' | 'UPI',
  portalId?:string,
  amount?:any,
  currency?:string,
  
): Observable<any> {
  let params = new HttpParams();
 if (token) {
    params = params.set('token', token);
  }
   if (sig) {
    params = params.set('sig', sig);
  }

    if (userId) {
    params = params.set('userId', userId);
  }
  if (type) {
    params = params.set('type', type);
  }

    if (portalId) {
    params = params.set('portalId', portalId);
  }

    if (amount) {
    params = params.set('amount', amount);
  }

    if (currency) {
    params = params.set('currency', currency);
  }

  return this.http.get(
    `${baseUrl}/anonymous/favourites/user`,
    { params },
  );
}

getFavouriteById(
  id: string,
): Observable<any> {
  return this.http.get(
    `${baseUrl}/api/v1/user-bank-favourites/${id}`,
  );
}

updateFavourite(
  id: string,
): Observable<any> {
  return this.http.put(
    `${baseUrl}/api/v1/user-bank-favourites/${id}`,
    {},
  );
}

// removeFavourite(
//   userId: string,
//   payinId: string,
// ): Observable<any> {
//   return this.http.delete(
//     `${baseUrl}/api/v1/user-bank-favourites/user/${userId}/payin/${payinId}`,
//   );
// }

removeFavourite(
   token: string,
  sig: any,
  userId: string,
   payinId: string,
): Observable<any> {
  let params = new HttpParams();
 if (token) {
    params = params.set('token', token);
  }
   if (sig) {
    params = params.set('sig', sig);
  }

    if (userId) {
    params = params.set('userId', userId);
  }
  if (payinId) {
    params = params.set('payinId', payinId);
  }

  return this.http.delete(
    `${baseUrl}/anonymous/favourites/delete`,
    { params },
  );
}

selectFavBank(
  token: string,
  sig: string,
  payinId: string,
  type: 'BANK' | 'UPI',
  userId: string,
  tempAmount: number
): Observable<any> {

  let params = new HttpParams();

  if (token) {
    params = params.set('token', token);
  }

  if (sig) {
    params = params.set('sig', sig);
  }

  if (payinId) {
    params = params.set('payinId', payinId);
  }

  if (type) {
    params = params.set('type', type);
  }

  if (userId) {
    params = params.set('userId', userId);
  }

  if (tempAmount != null) {
    params = params.set('tempAmount', tempAmount.toString());
  }

  return this.http.post(
    `${baseUrl}/anonymous/selectFavBank`,
    {},
    { params }
  );
}

}