import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";
import { DateTimeUtil } from "../../utils/date-time.utils";

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

  AgentPooling(portalId: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/branch/getAllData/${portalId}`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getFundDataByPortalId(portalId: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/funds/getAllData/${portalId}`).pipe(
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
      .patch<any>(`${baseUrl}/funds/payment/${bankSettleId}/accept`, {})
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

 

  getAllUpiFund(): Observable<any> {
    return this.http.get<any>(`${baseUrl}/funds/getAllUpiFunds`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getAllBankFundWithBranchId(subAgenId: any, settled: any): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/funds/getAllPaymentFundsByBranch/${subAgenId}/${settled}`,
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
        `${baseUrl}/funds/getPaymentFundsByBranch/${subAgenId}/${settled}`,
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

  acceptPayout(bankSettleId: any, accountId?: any): Observable<any> {
    let params = new HttpParams();

    if (accountId) {
      params = params.set("accountId", accountId);
    }

    return this.http
      .patch<any>(
        `${baseUrl}/funds/payout/${bankSettleId}/accept`,
        {},
        { params },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
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
      .patch<any>(`${baseUrl}/funds/payment/${bankSettleId}/reject`, formData)
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

  /// Accept and reject for the tp role

  acceptRejectThread(threadId: any, action: any, data?: any): Observable<any> {
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

  getAllUpiFundWithPortalId(
    portalId: any,
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
        `${baseUrl}/funds/getUpiFundWithPortalID/${portalId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllBankFundWithPortalId(
    portalId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/funds/getPaymentFundWithPortalID/${portalId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  // web do pyauouit fubd lo
  getAllPayoutFundWithPortalId(
    portalId: any,
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
        `${baseUrl}/funds/getPayoutFundWithPortalID/${portalId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getFundDataWithHeadAndBranchWithIdForOwner(ids: any[]): Observable<any> {
    let params = new HttpParams();

    ids.forEach((id) => {
      params = params.append("ids", id);
    });

    return this.http.get<any>(`${baseUrl}/webhook/broadcast/list`, { params });
  }

  getThreadsWithFundId(fundId: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/funds/fund-process-logs/${fundId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getTotalFundDetails(portalId: any): Observable<any> {
    let params = new HttpParams()
      // .set("fundType", fundType)
      .set("portalId", portalId);
    // .set("reviewStatus", reviewStatus);
    return this.http.get<any>(`${baseUrl}/funds/stats`, { params }).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getTotalFundCounts(
    fundType: any,
    portalId: any,
    reviewStatus: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("fundType", fundType)
      .set("portalId", portalId)
      .set("reviewStatus", reviewStatus);
    return this.http.get<any>(`${baseUrl}/funds/count`, { params }).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(error)),
    );
  }

  getAllUpiFundWithEntityAndPortalId(
    entityId: any,
    portalId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
    fromDate?: any,
    toDate?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString())
      .set("status", status);

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    if (fromDate) {
      params = params.set("fromDate", DateTimeUtil.toUtcISOString(fromDate));
    }

    if (toDate) {
      params = params.set("toDate", DateTimeUtil.toUtcISOString(toDate));
    }

    return this.http
      .get<any>(
        `${baseUrl}/funds/getUpiFundWithPortalIdAndEntityId/${portalId}/${entityId}`,
        { params },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllBankFundWithEntityAndPortalId(
    entityId: any,
    portalId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
    fromDate?: any,
    toDate?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString())
      .set("status", status);

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    if (fromDate) {
      params = params.set("fromDate", DateTimeUtil.toUtcISOString(fromDate));
    }

    if (toDate) {
      params = params.set("toDate", DateTimeUtil.toUtcISOString(toDate));
    }
    return this.http
      .get<any>(
        `${baseUrl}/funds/getPaymentFundWithPortalIdAndEntityId/${portalId}/${entityId}`,
        { params },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }
  getAllPayoutFundWithEntityAndPortalId(
    entityId: any,
    portalId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
    fromDate?: any,
    toDate?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString())
      .set("status", status);

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    if (fromDate) {
      params = params.set("fromDate", DateTimeUtil.toUtcISOString(fromDate));
    }

    if (toDate) {
      params = params.set("toDate", DateTimeUtil.toUtcISOString(toDate));
    }

    return this.http
      .get<any>(
        `${baseUrl}/funds/getPayoutFundWithPortalIdAndEntityId/${portalId}/${entityId}`,
        { params },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }
  getAllPayInFundWithcCompartId(
    compartId: any,
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
        `${baseUrl}/funds/getPayinFundsByComPartId/${compartId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }


     getAllPayOutFundWithcCompartId(
    compartId: any,
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
        `${baseUrl}/funds/getPayoutFundsByComPartId/${compartId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }


 //NEW
   getPayinFundWithPortalIdAndEntityIdUpdated(
    entityId: any,
    portalId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
    fromDate?: any,
    toDate?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString())
      .set("status", status);

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    if (fromDate) {
      params = params.set("fromDate", DateTimeUtil.toUtcISOString(fromDate));
    }

    if (toDate) {
      params = params.set("toDate", DateTimeUtil.toUtcISOString(toDate));
    }
    return this.http
      .get<any>(
        `${baseUrl}/funds/getPayinFundWithPortalIdAndEntityId/${portalId}/${entityId}`,
        { params },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }
}
