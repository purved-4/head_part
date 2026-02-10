import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";

@Injectable({
  providedIn: 'root'
})
export class OtherService {

  constructor(private http: HttpClient) {}

  sendWebhook(
    websiteId: string,
    payload?: any,
    snap?: File
  ): Observable<string> {
    const formData = new FormData();

    
    if (payload !== undefined && payload !== null) {
      formData.append("payload", JSON.stringify(payload));
    }

   
    if (snap) {
      formData.append("snap", snap);
    }

    return this.http.post(
      `${baseUrl}/auto/webhook/post/${websiteId}`,
      formData,
      {
        responseType: "text", 
      }
    );
  }

  
}
