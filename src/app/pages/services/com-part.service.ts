import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class ComPartService {
  constructor(private http: HttpClient) {}

  private handleError(error: any) {
    return throwError(() => error);
  }

  addComPart(data: any): Observable<void> {
    return this.http.post<any>(`${baseUrl}/comPart/createComPart`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  addComPartUser(data: any): Observable<void> {
    return this.http.post<any>(`${baseUrl}/comPart/createComPart`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  updateComPart(data: any): Observable<void> {
    return this.http.patch<any>(`${baseUrl}/comPart/updateComPart`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  updateComPartUser(id: any, data: any): Observable<void> {
    return this.http.patch<any>(`${baseUrl}/updateUser/${id}`, data).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  changeManualStatus(id: any, portalId: any): Observable<void> {
    return this.http
      .patch<any>(`${baseUrl}/comPart/changeManualStatus/${id}/${portalId}`, {})
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }
  toggleComPartStatus(id: any): Observable<void> {
    return this.http
      .patch<any>(`${baseUrl}/comPart/changeStatus/${id}`, {})
      .pipe(
        map((res) => res),
        catchError(this.handleError),
      );
  }

  getUserByComPartId(id: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getUsersByComPartId/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getComPartById(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/comPart/getComPartById/${id}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  getAllComPartByOwner(id: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getComPartsListByUserId/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getComPartsByEntityId(entityId: any, entityType: any): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/comPart/getComPartsByEntityId/${entityId}/${entityType}`,
      )
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getAllComPartByOwnerPaginated(
    id: any,
    page: any = 0,
    size: any = 10,
  ): Observable<any> {
    let param = new HttpParams();
    param = param.set("page", page);
    param = param.set("size", size);
    return this.http
      .get<any>(`${baseUrl}/comPart/getComPartsListByUserId/paginated/${id}`, {
        params: param,
      })
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getPortalByComPartId(
    id: any,
    page: any = 0,
    size: any = 10,
  ): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/portals/getAllByComPartId/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getPercentageByComPartId(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/comPart/getPercentages/${id}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }

  allotComPartToUser(comPartId: string, payload: any): Observable<any> {
    return this.http
      .post<any>(`${baseUrl}/allot-comPart/${comPartId}`, payload)
      .pipe(
        map((res) => res),
        catchError(this.handleError),
      );
  }

  getUsersByComPartId(comPartId: string): Observable<any[]> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getUsersByComPartId/${comPartId}`)
      .pipe(
        map((res) => res.data || []),
        catchError(this.handleError),
      );
  }

  addQuestionToComPart(data: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/messages/create`, data).pipe(
      map((res) => ({
        ...res.data,
        message: res.message,
      })),
      catchError(this.handleError),
    );
  }

  updateQuestionToComPart(data: any): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/messages/update`, data).pipe(
      map((res) => ({
        ...res.data,
        message: res.message,
      })),
      catchError(this.handleError),
    );
  }

  deleteQuestionToComPart(messageId: any): Observable<any> {
    return this.http
      .delete<any>(`${baseUrl}/messages/delete/${messageId}`)
      .pipe(
        map((res) => ({
          message: res.message,
        })),
        catchError(this.handleError),
      );
  }
  getQuestionByComPartId(comPartId: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/messages/comPart/${comPartId}`).pipe(
      map((res) => res.data || []),
      catchError(this.handleError),
    );
  }

  getQuestionByComPartIdPaginated(
    comPartId: any,
    page: any = 0,
    size: any = 10,
  ): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/messages/comPart/paginated/${comPartId}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }
  getAllQuestions(page = 0, size = 10): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/messages/getAll/paginated?page=${page}&size=${size}`,
      )
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  pinUpi(upiId: any, isPin: any) {
    return this.http.patch(`${baseUrl}/upi/${upiId}/pin?isPin=${isPin}`, {});
  }

  pinBank(bankId: any, isPin: any) {
    return this.http.patch(`${baseUrl}/banks/${bankId}/pin?isPin=${isPin}`, {});
  }

  changeStatusByUser(comPartId: string, userId: string) {
    const url = `${baseUrl}/comPart/changeStatusByUser/${comPartId}/${userId}`;
    return this.http.patch(url, {});
  }

  //domains
  addComPartDomain(comPartId: string, domain: any): Observable<any> {
    return this.http
      .post<any>(`${baseUrl}/comPart/${comPartId}/domains?domain=${domain}`, {})
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  updateComPartDomain(domainId: string, domain: any): Observable<any> {
    return this.http
      .put<any>(
        `${baseUrl}/comPart/domains/${domainId}?domainName=${domain}`,
        {},
      )
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getComPartDomain(comPartId: string): Observable<any> {
    return this.http.get<any>(`${baseUrl}/comPart/${comPartId}/domains`).pipe(
      map((response) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  deleteComPartDomain(domainId: any): Observable<any> {
    return this.http.delete<any>(`${baseUrl}/comPart/domains/${domainId}`).pipe(
      map((response) => response.data),
      catchError((error) => throwError(() => error)),
    );
  }

  getPercentageByEntityId(entityId: any, entityType: any): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/comPart/getPercentageByEntityId/${entityId}/${entityType}`,
      )
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  // New Revised Api's

  getBankDetailsByPortalIdAndAmount(portalId: any, amount: any) {
    let params = new HttpParams();

    if (amount != null && amount > 0) {
      params = params.set("amount", amount);
    }
    return this.http
      .get<any>(`${baseUrl}/manual/getBankDetailsByAmount/${portalId}`, {
        params,
      })
      .pipe(
        map((res) => res.data),
        catchError((err) => throwError(() => err)),
      );
  }
 
  assignPortal(bankId: any, portalId: any) {
    return this.http.patch<any>(
      `${baseUrl}/banks/${bankId}/assign-portal/${portalId}`,
      {},
    );
  }

  getAllByComPartWithPortal(compartId: any) {
    return this.http
      .get<any>(
        `${baseUrl}/comPart/banks/getAllByComPartWithPortal/${compartId}`,
      )
      .pipe(
        map((res) => res.data),
        catchError((err) => throwError(() => err)),
      );
  }

  getAllByComPartWithoutPortal(compartId: any) {
    return this.http
      .get<any>(
        `${baseUrl}/comPart/banks/getAllByComPartWithoutPortal/${compartId}`,
      )
      .pipe(
        map((res) => res.data),
        catchError((err) => throwError(() => err)),
      );
  }

  getCurrencies(comPartId: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/compart/currencies/${comPartId}`)
      .pipe(
        map((response) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  // POST
  saveCurrencies(comPartId: any, payload: any): Observable<any> {
    return this.http
      .post<any>(`${baseUrl}/compart/currencies/${comPartId}`, payload)
      .pipe(
        map((response) => response),
        catchError((error) => throwError(() => error)),
      );
  }

  toggleTransaction(payload: any): Observable<any> {
    return this.http.post(`${baseUrl}/comPart/toggle-transaction`, payload);
  }

  searchRecommendation(comPartId: string, userId: string) {
    return this.http.get<any>(`${baseUrl}/comPart/recommendation`, {
      params: {
        comPartId,
        userId,
      },
    });
  }

  getAllThreadCombinedPaginate(
    branchId: string,
    entityType: any,
    isResolved: any,
    type?: any,
    page: any = 0,
    size: any = 20,
  ): Observable<any> {
    if (type === undefined || type === null) {
      type = "all";
    }
    if (isResolved === "accepted") {
      isResolved = "accept";
    }
    if (isResolved === "rejected") {
      isResolved = "reject";
    }

    return this.http
      .get(
        `${baseUrl}/comPart/api/chat/findThreadCombined/paginated/${branchId}/${entityType}/${isResolved}/${type}?page=${page}&size=${size}&sort=updatedAt,desc`,
      )
      .pipe(
        map((res: any) => res.data),
        catchError((err) => throwError(err)),
      );
  }

  searchBankAndUpi(query: string, comPartId: string) {
    return this.http.get<any>(
      `${baseUrl}/comPart/banks/searchBankAndUpi/${comPartId}`,
      {
        params: { query },
      },
    );
  }

  getAllPayInFundWithCompartId(
    compartId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category?: any,
    fundType?: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }
    if (fundType !== null && fundType !== undefined) {
      params = params.set("fundType", fundType.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/comPart/funds/getPayinFundsByComPartId/${compartId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllPayOutFundWithCompartId(
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
        `${baseUrl}/comPart/funds/getPayoutFundsByComPartId/${compartId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  assignPortalToBank(bankId: string, portalId: string): Observable<any> {
    return this.http
      .patch<any>(
        `${baseUrl}/comPart/banks/${bankId}/assign-portal/${portalId}`,
        {},
      )
      .pipe(
        catchError((error) => {
          throw error;
        }),
      );
  }

  removePortal(id: string): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/comPart/banks/${id}/remove-portal`, {})
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  addLimits(LimitData: any): Observable<any> {
    return this.http.post(`${baseUrl}/comPart/entityBalance/add`, LimitData);
  }

  getLatestLimitsByEntityAndTypeUpdate(
    entityId: any,
    type: any,
  ): Observable<any> {
    return this.http
      .get(`${baseUrl}/comPart/entityBalance/latest/${entityId}/${type}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getPortalTokenAndId(portalId: string): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getTokenKey/${portalId}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getLatestLimitsByEntityAndType(entityId: any, type: any): Observable<any> {
    return this.http
      .get(`${baseUrl}/comPart/entityBalance/latestBalance/${entityId}/${type}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getLogoutStatus(userId: any) {
    return this.http
      .get<
        any[]
      >(`${baseUrl}/comPart/processing-time/latest-before-today/${userId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getThreadDetailsById(threadId: string): Observable<any> {
    return this.http
      .get(`${baseUrl}/comPart/api/chat/thread/${threadId}`, {
        withCredentials: true,
      })
      .pipe(map((res: any) => res.data));
  }

  getChatMembersByThreadId(threadId: any): Observable<any> {
    return this.http
      .get(`${baseUrl}/comPart/api/chat/findMemberByThreadId/${threadId}`)
      .pipe(map((res: any) => res.data));
  }

  getMessageByThreadId(
    threadId: any,
    branch: any,
    page: any,
    size: any,
  ): Observable<any> {
    return this.http
      .get(
        `${baseUrl}/comPart/api/chat/findMessageByThreadId/${threadId}/${branch}?page=${page}&size=${size}`,
      )
      .pipe(map((res: any) => res.data.content));
  }

  uploadAttachment(threadId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append("file", file);

    return this.http
      .post(`${baseUrl}/comPart/api/chat/upload/${threadId}`, formData)
      .pipe(map((res: any) => res.data));
  }

  acceptRejectThread(threadId: any, action: any, data?: any): Observable<any> {
    return this.http
      .patch<any>(
        `${baseUrl}/comPart/api/chat/resolveThread/${threadId}/${action}`,
        {},
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }
  editpayoutRejectedFund(threadId: any, data: any): Observable<any> {
    return this.http
      .patch<any>(`${baseUrl}/comPart/funds/updatePayout/${threadId}`, data)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getPortalByComPartIdAndCurrency(
    id: any,
    currenyId: any,
    page: any = 0,
    size: any = 10,
  ): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/comPart/portals/getAllByComPartIdAndCurrencyId/paginated/${id}/${currenyId}`,
      )
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  //new snashot
  uploadUpiOcr(file: File) {
    const formData = new FormData();
    formData.append("snapshot", file);

    return this.http.post(`${baseUrl}/upi-ocr-upload`, formData);
  }

  uploadOcr(file: File, id: any, type: string) {
    const formData = new FormData();

    formData.append("file", file);

    return this.http.post(
      `${baseUrl}/ocr?comPartId=${id}&type=${type}`,
      formData,
    );
  }

  uploadGpayOcr(file: File) {
    const formData = new FormData();
    formData.append("snapshot", file);

    return this.http.post(`${baseUrl}/gpay-ocr-upload`, formData);
  }

  //new
  getAllUpiByBankId(bankId: any): Observable<any> {
    return this.http
      .get(`${baseUrl}/comPart/upi/getAllUpiByBankId/${bankId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getPayinFundWithPortalID(
    portalId: any,
    status: any,
    page: number = 0,
    pageSize: number = 10,
    category: any,
    fundType: any,
  ): Observable<any> {
    let params = new HttpParams()
      .set("page", page.toString())
      .set("size", pageSize.toString());

    if (category !== null && category !== undefined) {
      params = params.set("category", category.toString());
    }

    if (fundType !== null && fundType !== undefined) {
      params = params.set("fundType", fundType.toString());
    }

    return this.http
      .get<any>(
        `${baseUrl}/comPart/funds/getPayinFundWithPortalID/${portalId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getAllByComPartWithPortalPagination(
    compartId: any,
    page: number = 0,
    size: number = 10,
    currency?: string,
  ) {
    let url = `${baseUrl}/comPart/banks/getAllByComPartWithPortal/pagination/${compartId}?page=${page}&size=${size}`;

    if (currency) {
      url += `&currency=${currency}`;
    }

    return this.http.get<any>(url).pipe(
      map((res) => res.data),
      catchError((err) => throwError(() => err)),
    );
  }

  deleteCurrencyRate(
    compartId: string,
    rateId: string,
    currencyId: string,
  ): Observable<any> {
    return this.http
      .delete<any>(
        `${baseUrl}/compart/currencies/delete?compartId=${compartId}&rateId=${rateId}&currencyId=${currencyId}`,
      )
      .pipe(
        map((response) => response),
        catchError((error) => throwError(() => error)),
      );
  }

  updateCurrencyRate(
    compartId: string,
    rateId: string,
    currencyId: string,
    rate: number,
  ): Observable<any> {
    return this.http
      .patch<any>(
        `${baseUrl}/compart/currencies/update?compartId=${compartId}&rateId=${rateId}&currencyId=${currencyId}&rate=${rate}`,
        {},
      )
      .pipe(
        map((response) => response),
        catchError((error) => throwError(() => error)),
      );
  }

  getByThreadIdFundIdAndType(
    threadId: any,
    fundId: any,
    fundType: any,
  ): Observable<any> {
    return this.http
      .get<any>(
        `${baseUrl}/comPart/getFundWithThreadIdFundIdFundType/${threadId}/${fundId}/${fundType}`,
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  acceptPayoutFund(compartId: string, fundId: string): Observable<any> {
    return this.http
      .post<any>(`${baseUrl}/comPart/acceptFund/${compartId}/${fundId}`, {})
      .pipe(
        map((response) => response),
        catchError((error) => throwError(() => error)),
      );
  }

  rejectPayoutFund(
    compartId: string,
    fundId: string,
    reason: string,
  ): Observable<any> {
    return this.http
      .post<any>(
        `${baseUrl}/comPart/rejectFund/${compartId}/${fundId}?reason=${reason}`,
        {},
      )
      .pipe(
        map((response) => response),
        catchError((error) => throwError(() => error)),
      );
  }

  getPayoutFunds(compartId: string): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getPayoutFunds/${compartId}`, {})
      .pipe(
        map((response) => response),
        catchError((error) => throwError(() => error)),
      );
  }

  getThreadByEntityIdAndFund(
    entityId: string,
    fundId: string,
    fundType: string,
  ) {
    return this.http.get<any>(
      `${baseUrl}/comPart/getThreadByEntityIdTypeAndFund/${entityId}/${fundId}/${fundType}`,
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
        `${baseUrl}/comPart/funds/getPayoutFundWithPortalID/${portalId}/${status}`,
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getThreadsWithFundId(fundId: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/fund-process-logs/${fundId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  generateAnonymousLink(
    portalId: any,
    currency?: any,
    expireMinute?: any,
    userType?: any,
  ): Observable<any> {
    return this.http.post(
      `${baseUrl}/api/v1/internal/links/generate/${portalId}`,
      { currency, expireMinute, userType },
    );
  }

  getAnonymousLinks(portalId: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/api/v1/internal/links/${portalId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  verifyLinkWithTokenAndSignature(token: any, signature: any) {
    return this.http
      .get<any>(`${baseUrl}/open/verify?token=${token}&sig=${signature}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  sendWebhook(
    portalId: string,
    payload?: any,
    snap?: any,
    currency?: any,
    token?: any,
    signature?: any,
    userId?: any,
    turnstileToken?: string,
  ): Observable<string> {
    const formData = new FormData();
    let params = new HttpParams();

    if (payload !== undefined && payload !== null) {
      formData.append("payload", JSON.stringify(payload));
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

  sendWebhookManual(
    portalId: string,
    payload: any,
    snap: any,
    currency: any,
    userId: any,
  ): Observable<string> {
    const formData = new FormData();

    if (payload) {
      formData.append(
        "payload",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
    }

    if (snap) {
      formData.append("snap", snap);
    }

    let params = new HttpParams();

    if (currency) {
      params = params.set("currency", currency);
    }

    if (userId != null) {
      params = params.set("userId", userId);
    }

    return this.http.post(
      `${baseUrl}/manual/webhook/post/${portalId}`,
      formData,
      {
        responseType: "text",
        params,
      },
    );
  }

 getUpiByAmountManual(
    portalId: any,
    amount?: any,
    currency?: any,
    userId?: string,
    isSkip?: boolean,
    isNew?: boolean,
    reason?: string,
    currentPayinId?: string,
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

    if (isSkip != null) {
      params = params.set("isSkip", isSkip);
    }

    if (isNew != null) {
      params = params.set("isNew", isNew);
    }

    if (reason != null) {
      params = params.set("reason", reason);
    }
    if (currentPayinId != null) {
      params = params.set("currentPayinId", currentPayinId);
    }

    return this.http
      .get(`${baseUrl}/manual/getUpiDetailsByAmount/${portalId}`, {
        params,
      })
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }
  

 getBankByAmountManual(
    portalId: any,
    amount: any,
    currency: any,
    userId: string,
    isSkip?: boolean,
    isNew?: boolean,
    reason?: string,
    currentPayinId?: string,
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

    if (isSkip != null) {
      params = params.set("isSkip", isSkip);
    }
    if (isNew != null) {
      params = params.set("isNew", isNew);
    }

    if (reason != null) {
      params = params.set("reason", reason);
    }

    if (currentPayinId != null) {
      params = params.set("currentPayinId", currentPayinId);
    }

    return this.http
      .get(`${baseUrl}/manual/getBankDetailsByAmount/${portalId}`, { params })
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error)),
      );
  }

  getThreadByFundId(fundId: string): Observable<any> {
    return this.http
      .get(`${baseUrl}/comPart/api/chat/findThreadByFundsId/${fundId}`)
      .pipe(
        map((res: any) => res.data),
        catchError((err) => throwError(err)),
      );
  }

  getUserStatusByFund(fundId: string, fundType: string): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getUserStatusByFund/${fundId}/${fundType}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(error)),
      );
  }

  getPayoutsCountsByUserId(userId: string, portalId: string): Observable<any> {
    return this.http.get(
      `${baseUrl}/comPart/getPayoutsCountsByUserId?userId=${userId}&portalId=${portalId}`,
    );
  }
  getPayinsCountsByUserId(userId: string, portalId: string): Observable<any> {
    return this.http.get(
      `${baseUrl}/comPart/getPayinsCountsByUserId?userId=${userId}&portalId=${portalId}`,
    );
  }

  markFundAsProcessed(id: string): Observable<any> {
    return this.http.patch(`${baseUrl}/comPart/${id}/mark-cp`, {});
  }
  updateUserId(id: string, payload: any): Observable<any> {
    return this.http.patch(`${baseUrl}/comPart/${id}/update-user`, payload);
  }

  removeAssignment(
    payinId: string,
    payinType: string,
    userId: any,
    portalId: string,
  ) {
    let params = new HttpParams();

    if (payinId != null) {
      params = params.set("payinId", payinId);
    }

    if (payinType != null) {
      params = params.set("payinType", payinType);
    }
    if (userId != null) {
      params = params.set("userId", userId);
    }
    if (portalId != null) {
      params = params.set("portalId", portalId);
    }
    return this.http
      .post(
        `${baseUrl}/manual/remove-assignment`,
        {},
        {
          params,
        },
      )
      .pipe(
        map((response: any) => response),
        catchError((error) => throwError(() => error)),
      );
  }

restoreBankAndUpi(comPartId: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/manual/restoreBankAndUpi/${comPartId}`).pipe(
      map((res) => res.data),
      catchError(this.handleError),
    );
  }


  viewProflieDetails(comPartId: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/comPart/getDetails/${comPartId}`)
      .pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );
  }

  getPayinRemainingFundsDetail(payinId: any, type: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/comPart/capacity/${type}/${payinId}`).pipe(
        map((res) => res.data),
        catchError(this.handleError),
      );;
  }
}
