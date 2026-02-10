import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { HttpClient } from "@angular/common/http";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class UpiService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/upi/getAll`);
  }

  getBybranchId(id: any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/upi/getAllByEntityId/${id}`);
  }

 getByBranchIdPaginated(
  id: string,
  page: number = 0,
  size: number = 20
): Observable<any> {

  return this.http.get<any>(
    `${baseUrl}/upi/getAllByEntityId/paginated/${id}`,
    {
      params: {
        page: page.toString(),
        size: size.toString()
      }
    }
  );
}

  getAllByEntityIdAndWebsiteId(id: any,websiteId:any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/upi/getAllByEntityIdAndWebsiteId/${id}/${websiteId}`).pipe(
          map((response: any) => response.data),
          catchError((error) => throwError(() => error))
        );
  }

  getAllByWebsiteId(websiteId:any): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/upi/getAllByWebsiteId/${websiteId}`) .pipe(
          map((response: any) => response.data),
          catchError((error) => throwError(() => error))
        )
  }
  add(upi: FormData): Observable<any> {
    return this.http.post<any>(`${baseUrl}/upi/create`, upi);
  }

   updateUpi(upi: FormData): Observable<any> {
    return this.http.patch<any>(`${baseUrl}/upi/update`, upi);
  }
  
}
