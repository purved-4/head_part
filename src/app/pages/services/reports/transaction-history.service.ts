import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
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
    entityId: string;
    entityType: string;
    from: string;
    to: string;
  }): Observable<any> {
    let httpParams = new HttpParams()
      .set("entityId", params.entityId)
      .set("entityType", params.entityType.toUpperCase())
      .set("from", DateTimeUtil.toUtcISOString(params.from))
      .set("to", DateTimeUtil.toUtcISOString(params.to));

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
}
