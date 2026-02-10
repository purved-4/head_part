import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class FundsService {
  constructor(private http: HttpClient) {}

  AdminPooling(): Observable<any> {
    return this.http.get<any>(`${baseUrl}/branch/getAllData`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  AgentPooling(websiteId: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/branch/getAllData/${websiteId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getFundDataByWebsiteId(websiteId: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/funds/getAllData/${websiteId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getFundDataBybranchId(branchId: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/funds/getAllDataByBranch/${branchId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllUpiFundWithId(upiId: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/funds/getAllUpiFunds/${upiId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getAllBankFundWithId(bankId: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/funds/getAllBankFunds/${bankId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  settleUpiFund(upiSettleId: any): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/funds/upi/${upiSettleId}/accept`, {})
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  settleBankFund(bankSettleId: any): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/funds/bank/${bankSettleId}/accept`, {})
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllFund(): Observable<any> {
    return this.http.get<any>(`${baseUrl}/funds/getAllData`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getAllBankFund(): Observable<any> {
    return this.http.get<any>(`${baseUrl}/funds/getAllBankFunds`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getAllUpiFund(): Observable<any> {
    return this.http.get<any>(`${baseUrl}/funds/getAllUpiFunds`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getAllBankFundWithBranchId(subAgenId: any, settled: any): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/funds/getAllBankFundsByBranch/${subAgenId}/${settled}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllBankFundWithBranchIdPaginated(
    subAgenId: any,
    settled: any,
    page: number = 0,
    pageSize: number = 10,
    searchQuery?: string,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());

    if (searchQuery && searchQuery.trim()) {
      params = params.set("search", searchQuery.trim());
    }
    return this.http
      .get<any>(
        `${baseUrl}/funds/getBankFundsByBranch/${subAgenId}/${settled}`,
        { params },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllUpiFundWithBranchId(subAgenId: any, settled: any): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/funds/getAllUpiFundsByBranch/${subAgenId}/${settled}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllUpiFundWithBranchIdPaginated(
    subAgenId: any,
    settled: any,
    page: number = 0,
    pageSize: number = 10,
    searchQuery?: string,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());

    if (searchQuery && searchQuery.trim()) {
      params = params.set("search", searchQuery.trim());
    }
    return this.http
      .get<any>(
        `${baseUrl}/funds/getUpiFundsByBranch/${subAgenId}/${settled}`,
        { params },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllpayoutTrueFalseBybranchId(
    subAgenId: any,
    settled: any,
  ): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/funds/getAllPayoutBankFundsByBranch/${subAgenId}/${settled}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllpayoutTrueFalseBybranchIdPaginate(
    subAgenId: any,
    settled: any,
    page: number = 0,
    pageSize: number = 10,
    searchQuery?: string,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());

    if (searchQuery && searchQuery.trim()) {
      params = params.set("search", searchQuery.trim());
    }
    return this.http
      .get<any>(
        `${baseUrl}/funds/getPayoutBankFundsByBranch/${subAgenId}/${settled}`,
        { params },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  acceptpayout(bankSettleId: any, accountId?: any): Observable<any> {
    return this.http
      .patch<any>(
        `${baseUrl}/funds/payout/${bankSettleId}/accept?accountId=${accountId}`,
        {},
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  rejectpayout(
    bankSettleId: string,
    reason: string,
    file: any,
  ): Observable<any> {
    const formData = new FormData();
    formData.append("reason", reason);
    formData.append("file", file);

    return this.http
      .patch<any>(`${baseUrl}/funds/payout/${bankSettleId}/reject`, formData)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  /// rejact

  rejectUpiFund(
    bankSettleId: string,
    reason: string,
    file: any,
  ): Observable<any> {
    const formData = new FormData();
    formData.append("reason", reason);
    formData.append("file", file);

    return this.http
      .patch<any>(`${baseUrl}/funds/upi/${bankSettleId}/reject`, formData)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  rejectBankFund(
    bankSettleId: string,
    reason: string,
    file: any,
  ): Observable<any> {
    const formData = new FormData();
    formData.append("reason", reason);
    formData.append("file", file);

    return this.http
      .patch<any>(`${baseUrl}/funds/bank/${bankSettleId}/reject`, formData)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  // websocket

  broadcast(subAgenId: any, role: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/webhook/broadcast/${subAgenId}/${role}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  // updateAmount(data: any) {
  //   return this.http.patch(`${baseUrl}/funds/update`, data);
  // }

  updateAmount(request: any, file: File): Observable<any> {
    const formData = new FormData();

    formData.append(
      "request",
      new Blob([JSON.stringify(request)], { type: "application/json" }),
    );

    if (file) {
      formData.append("file", file);
    }

    return this.http.patch<any>(`${baseUrl}/funds/update`, formData).pipe(
      map((res) => res.data),
      catchError((err) => throwError(() => err)),
    );
  }

  updateProcessingStatus(fundId: any, branchId: any) {
    return this.http.patch(
      `${baseUrl}/funds/payoutProcessing/${fundId}/${branchId}`,
      {},
    );
  }

  /// Accept and reject for the other role

  acceptRejectThread(threadId: any, action: any): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/api/chat/resolveThread/${threadId}/${action}`, {})
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getByThreadIdFundIdAndType(
    threadId: any,
    fundId: any,
    fundType: any,
  ): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/funds/getFundWithThreadIdFundIdFundType/${threadId}/${fundId}/${fundType}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  // payout rejectin

  editpayoutRejectedFund(threadId: any, data: any): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/funds/updatePayout/${threadId}`, data)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllUpiFundWithWebsiteId(
    websiteId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/funds/getUpiFundWithWebsiteID/${websiteId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllBankFundWithWebsiteId(
    websiteId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());


    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/funds/getBankFundWithWebsiteID/${websiteId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllPayoutFundWithWebsiteId(
    websiteId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/funds/getPayoutFundWithWebsiteID/${websiteId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllUpiFundWithEntityAndWebsiteId(
    entityId: any,
    websiteId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString())
      .set("status", status);

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/funds/getUpiFundWithWebsiteIdAndEntityId/${websiteId}/${entityId}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllBankFundWithEntityAndWebsiteId(
    entityId: any,
    websiteId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString())
      .set("status", status);

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/funds/getBankFundWithWebsiteIdAndEntityId/${websiteId}/${entityId}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllPayoutFundWithEntityAndWebsiteId(
    entityId: any,
    websiteId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString())
      .set("status", status);

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }


    return this.http
      .get<any>(
        `${baseUrl}/funds/getPayoutFundWithWebsiteIdAndEntityId/${websiteId}/${entityId}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }
}
