import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, Observable, throwError } from "rxjs";
import baseUrl from "../helper";
import { FundsReport } from "../../../components/reports/funds-report/funds-report.component";
import { DateTimeUtil } from "../../../utils/date-time.utils";

export interface PortalWiseReport {
  entityType: string;
  entityId: string;

  fundsType: string;
  fundsId: string;

  balanceBefore: number;
  balanceAfter: number;

  extraAmount: number;
  distributedAmount: number;
  distributedPercentage: number;
  mutedPercentage: number;
  totalPercentage: number;

  transactionType: string;
  remark: string;

  portalAmount: number;
  mutedAmount: number;
  amount: number;
  runningBalance: number;

  dynamicPercentage: number;

  portalId: string;
  portalDomain: string;

  dateTime: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: "root" })
export class TransactionHistoryService {
  constructor(private http: HttpClient) {}
getEntityReport(params: {
    entityId?: string;
    entityType: string;
    portalId?: string;
    from: string;
    to: string;
    page?: number;
    pageSize?: number;
    transactionType?: string;
    status?: string;
    searchTerm?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();

    if (params.entityType) {
      httpParams = httpParams.set(
        "entityType",
        params.entityType.toUpperCase(),
      );
    }

    if (params.from) {
      httpParams = httpParams.set(
        "from",
        DateTimeUtil.toUtcISOString(params.from),
      );
    }

    if (params.to) {
      httpParams = httpParams.set("to", DateTimeUtil.toUtcISOString(params.to));
    }

    httpParams = httpParams.set("page", String(params.page ?? 0));
    httpParams = httpParams.set("pageSize", String(params.pageSize ?? 10));

    if (params.entityId) {
      httpParams = httpParams.set("entityId", params.entityId);
    }

    if (params.portalId) {
      httpParams = httpParams.set("portalId", params.portalId);
    }

    if (params.transactionType) {
      httpParams = httpParams.set("transactionType", params.transactionType);
    }

    if (params.status) {
      httpParams = httpParams.set("status", params.status);
    }

    if (params.searchTerm) {
      httpParams = httpParams.set("searchTerm", params.searchTerm);
    }

    return this.http.get<any>(`${baseUrl}/balance-history/report`, {
      params: httpParams,
    });
  }

  getEntityReports(params: {
    entityId: any;
    entityType: any;
    from: any;
    to: any;
    dataEntityId?: any;
  }): Observable<any> {
    let httpParams = new HttpParams()
      .set("entityId", params.entityId)
      .set("entityType", params.entityType)
      .set("from", DateTimeUtil.toUtcISOString(params.from))
      .set("to", DateTimeUtil.toUtcISOString(params.to))
      .set("dataEntityId", params.dataEntityId);

    return this.http.get<any>(`${baseUrl}/balance-history/report`, {
      params: httpParams,
    });
  }

  getByEntityTypeAndId(
    entityType: string,
    entityId: string,
  ): Observable<{ data: PortalWiseReport }> {
    return this.http.get<{ data: PortalWiseReport }>(
      `${baseUrl}/balance-history/getByEntityTypeAndId/${entityType}/${entityId}`,
    );
  }

  getReport(
    from: string,
    to: string,
    portalId?: string,
    entityId?: string,
    reviewStatus: string = "ACCEPTED",
    reportType: string = "ALL",
  ): Observable<FundsReport> {
    let params = new HttpParams()
      .set("from", from)
      .set("to", to)
      .set("reviewStatus", reviewStatus)
      .set("reportType", reportType);

    if (portalId) params = params.set("portalId", portalId);
    if (entityId) params = params.set("entityId", entityId);

    return this.http.get<FundsReport>(
      `${baseUrl}/balance-history/fundsReport`,
      { params },
    );
  }

  getBalanceHistorySnapshot(payload: any): Observable<any> {
    const formattedPayload = {
      ...payload,
      date: new Date(payload.date).toISOString(), // Returns: "2026-03-24T00:00:00.000Z"
    };

    return this.http.get<any>(
      `${baseUrl}/balance-history/balance-snapshot?entityId=${payload.entityId}&portalId=${payload.portalId}&date=${formattedPayload.date}`,
    );
  }

  settleBalance(payload: any): Observable<any> {
    // Convert to proper ISO string with seconds and Zulu timezone
    const formattedPayload = {
      ...payload,
      dateTime: new Date(payload.dateTime).toISOString(), // Returns: "2026-03-24T00:00:00.000Z"
    };
    const web = "PORTAL";
    return this.http.post<any>(
      `${baseUrl}/balance-history/manual-entryV2?action=${web}`,
      formattedPayload,
    );
  }

  getSettleHistory(payload: any): Observable<any> {
    let httpParams = new HttpParams()
      .set("entityId", payload.entityId)
      .set("portalId", payload.portalId)
      .set("from", DateTimeUtil.toUtcISOString(payload.from))
      .set("to", DateTimeUtil.toUtcISOString(payload.to));

    return this.http.get<any>(`${baseUrl}/balance-history/getSettleReport`, {
      params: httpParams,
    });
  }

  getBranchDataHistory(payload: any): Observable<any> {
    let httpParams = new HttpParams()
      .set("from", DateTimeUtil.toUtcISOString(payload.fromDate)!)
      .set("to", DateTimeUtil.toUtcISOString(payload.toDate)!)
      .set("page", payload.page)
      .set("limit", payload.limit);

    return this.http.get<any>(`${baseUrl}/branch/data/report`, {
      params: httpParams,
    });
  }

  getEntityBalanceSearch(params: {
    entityId?: string;
    status?: string | string[]; // <-- string bhi aur array bhi
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();

    if (params.entityId) {
      httpParams = httpParams.set("entityId", params.entityId);
    }

    if (params.status) {
      const statusValue = Array.isArray(params.status)
        ? params.status.join(",")
        : params.status;

      httpParams = httpParams.set("status", statusValue);
    }

    if (params.fromDate) {
      httpParams = httpParams.set(
        "fromDate",
        DateTimeUtil.toUtcISOString(params.fromDate),
      );
    }

    if (params.toDate) {
      httpParams = httpParams.set(
        "toDate",
        DateTimeUtil.toUtcISOString(params.toDate),
      );
    }

    httpParams = httpParams.set("page", String(params.page ?? 0));
    httpParams = httpParams.set("pageSize", String(params.pageSize ?? 10));



    return this.http.get<any>(`${baseUrl}/entityBalance/search`, {
      params: httpParams,
    });
  }

  
searchMultiPortalFund(payload: any): Observable<any> {
    return this.http
     .post<any>(`${baseUrl}/multi-portal-fund/search`, payload)
     .pipe(
        catchError((error) => {
         return throwError(() => error);
        }),
     );
}

reportMultiPortalFund(
    entityId: any,
    entityType: any,
    filters: any = {},
  ): Observable<any> {
    let params = new HttpParams()
      .set("entityId", entityId)
      .set("entityType", entityType);

    if (filters.transactionTypes?.length) {
      filters.transactionTypes.forEach(
        (v: any) => (params = params.append("transactionTypes", v)),
      );
    }
    if (filters.amountTypes?.length) {
      filters.amountTypes.forEach(
        (v: any) => (params = params.append("amountTypes", v)),
      );
    }
     if (filters.portalIds?.length) {
 filters.portalIds.forEach(
        (v: any) => (params = params.append("portalIds", v)),
      );    }
    if (filters.currencies?.length) {
      filters.currencies.forEach(
        (v: any) => (params = params.append("currencies", v)),
      );
    }
    if (filters.paymentMethods?.length) {
      filters.paymentMethods.forEach(
        (v: any) => (params = params.append("paymentMethods", v)),
      );
    }
    if (filters.fromDate) {
      params = params.set("fromDate", filters.fromDate);
    }
    if (filters.toDate) {
      params = params.set("toDate", filters.toDate);
    }
   

    return this.http
      .get<any>(`${baseUrl}/multi-portal-fund/report`, { params })
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }



  reportComPartFund(entityId: string, filters: any): Observable<any> {
    const params = this.buildParams(entityId, filters, ["portalIds"]);
    return this.http.get(`${baseUrl}/multi-portal-fund/report/compart`, { params });
  }

  reportHeadBranchFund(
  entityId: string,
  filters: any
): Observable<any> {
  const params = this.buildParams(
    entityId,
    filters,
    ["inventories"]
  );

  return this.http.get(
    `${baseUrl}/multi-portal-fund/report/head-branch`,
    { params }
  );
}

reportOtherFund(
  entityId: string,
  filters: any
): Observable<any> {
  const params = this.buildParams(
    entityId,
    filters,
    ["comPartIds", "inventories"]
  );

  return this.http.get(
    `${baseUrl}/multi-portal-fund/report/other`,
    { params }
  );
}


  private buildParams(
  entityId: string,
  filters: any,
  extraArrayKeys: string[]
): HttpParams {

  let params = new HttpParams().set("entityId", entityId);

  const arrayKeys = [
    "transactionTypes",
    "amountTypes",
    "currencies",
    "paymentMethods",
    ...extraArrayKeys,
  ];

  arrayKeys.forEach((key) => {
    const values: string[] = filters[key];

    if (values?.length) {
      values.forEach((value) => {
        params = params.append(key, value);
      });
    }
  });

  if (filters.fromDate) {
    params = params.set("fromDate", filters.fromDate);
  }

  if (filters.toDate) {
    params = params.set("toDate", filters.toDate);
  }

  return params;
}

  getInventory(entities:any, payment:any){

    let params = new HttpParams()
      .set("entityId", entities)
      .set("paymentMethods", payment);


    return this.http
      .get<any>(`${baseUrl}/multi-portal-fund/getInventory`, { params })
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        }),
      );

  }


  getFundsForAllLevels(params: {
    entityId: string;
    entityType: string;
    reviewStatus: string[];
    fundType: string[];
    fundMode: string[];
    fromDate: string | Date;
    toDate: string | Date;
    currency?: string[];
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set("entityId", params.entityId);
    httpParams = httpParams.set("entityType", params.entityType);

    if (params.reviewStatus && params.reviewStatus.length > 0) {
      params.reviewStatus.forEach((status) => {
        httpParams = httpParams.append("reviewStatus", status);
      });
    }

    if (params.fundType && params.fundType.length > 0) {
      params.fundType.forEach((type) => {
        httpParams = httpParams.append("fundType", type);
      });
    }

    if (params.fundMode && params.fundMode.length > 0) {
      params.fundMode.forEach((mode) => {
        httpParams = httpParams.append("fundMode", mode);
      });
    }

    const fromDateStr =
      params.fromDate instanceof Date
        ? params.fromDate.toISOString()
        : params.fromDate;
    const toDateStr =
      params.toDate instanceof Date
        ? params.toDate.toISOString()
        : params.toDate;

    httpParams = httpParams.set("fromDate", fromDateStr);
    httpParams = httpParams.set("toDate", toDateStr);

    if (params.currency && params.currency.length > 0) {
      params.currency.forEach((mode) => {
        httpParams = httpParams.append("currencies", mode);
      });
    }

    if (params.page !== undefined) {
      httpParams = httpParams.set("page", params.page.toString());
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set("size", params.size.toString());
    }
    if (params.sort && params.sort.length > 0) {
      httpParams = httpParams.set("sort", params.sort);
    }

    return this.http.get<any>(`${baseUrl}/funds/getFundData`, {
      params: httpParams,
    });
  }

}
