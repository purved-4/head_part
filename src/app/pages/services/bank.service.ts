import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";
import { catchError, map, Observable, throwError } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class BankService {
  constructor(private http: HttpClient) {}

  addBank(upi: any): Observable<any> {
    return this.http.post<any>(`${baseUrl}/banks/create`, upi);
  }

  update(upi: any): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/banks/update`, upi);
  }

  getBankDataWithSubAdminId(id: any): Observable<any> {
    return this.http.get<any>(`${baseUrl}/banks/getAllByEntityId/${id}`);
  }

  getBankDataWithSubAdminIdPaginated(
    id: string,
    page: number = 0,
    size: number = 20,
  ): Observable<any> {
    return this.http.get<any>(
      `${baseUrl}/banks/getAllByEntityId/paginated/${id}`,
      {
        params: {
          page: page.toString(),
          size: size.toString(),
        },
      },
    );
  }

  getBankDataWithEntityIdAndWebsiteId(
    id: any,
    websiteId: any,
  ): Observable<any> {
    return this.http.get<any>(
      `${baseUrl}/banks/getAllByEntityIdAndWebsiteId/${id}/${websiteId}`,
    ).pipe(
          map((response: any) => response.data),
          catchError((error) => throwError(() => error))
        );;
  }

   getAllByWebsiteId(websiteId:any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/banks/getAllByWebsiteId/${websiteId}`) .pipe(
          map((response: any) => response.data),
          catchError((error) => throwError(() => error))
        );;
  }
}
