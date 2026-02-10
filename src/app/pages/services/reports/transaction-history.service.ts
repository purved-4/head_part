import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import baseUrl from "../helper";
import { FundsReport } from "../../../components/reports/funds-report/funds-report.component";

export interface WebsiteWiseReport {
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

  websiteAmount: number;
  mutedAmount: number;
  amount: number;
  runningBalance: number;

  dynamicPercentage: number;

  websiteId: string;
  websiteDomain: string;

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
      .set("from", `${params.from}T00:00:00`)
      .set("to", `${params.to}T00:00:00`);

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
      .set("from", `${params.from}T00:00:00`)
      .set("to", `${params.to}T00:00:00`)
      .set("dataEntityId", params.dataEntityId);

    return this.http.get<any>(`${baseUrl}/balance-history/report`, {
      params: httpParams,
    });
  }

  getByEntityTypeAndId(
    entityType: string,
    entityId: string,
  ): Observable<{ data: WebsiteWiseReport }> {
    return this.http.get<{ data: WebsiteWiseReport }>(
      `${baseUrl}/balance-history/getByEntityTypeAndId/${entityType}/${entityId}`,
    );
  }

  getReport(
    from: string,
    to: string,
    websiteId?: string,
    entityId?: string,
    reviewStatus: string = "ACCEPTED",
    reportType: string = "ALL",
  ): Observable<FundsReport> {
    let params = new HttpParams()
      .set("from", from)
      .set("to", to)
      .set("reviewStatus", reviewStatus)
      .set("reportType", reportType);

    if (websiteId) params = params.set("websiteId", websiteId);
    if (entityId) params = params.set("entityId", entityId);

    return this.http.get<FundsReport>(
      `${baseUrl}/balance-history/fundsReport`,
      { params },
    );
  }

  getBalanceHistorySnapshot(
    payload: any
  ): Observable<any> {
    return this.http.get<any>(
      `${baseUrl}/balance-history/balance-snapshot?entityId=${payload.entityId}&websiteId=${payload.websiteId}&date=${payload.date}T00:00:00`,
    );
  }

  settleBalance(payload:any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/balance-history/manual-entry`, payload);
  }

  getSettleHistory(payload:any): Observable<any> {
    let httpParams = new HttpParams()
      .set("entityId", payload.entityId)
      .set("websiteId", payload.websiteId)
      .set("from", `${payload.fromDate}T00:00:00`)
      .set("to", `${payload.toDate}T00:00:00`);

    return this.http.get<any>(`${baseUrl}/balance-history/getSettleReport`, {
      params: httpParams,
    });
  }
}
