import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import baseUrl from "./helper";

@Injectable({
  providedIn: "root",
})
export class CapacityService {
  constructor(private http: HttpClient) {}

  addCapacity(data: any) {
    return this.http.post(`${baseUrl}/transaction-capacity/add`, data);
  }

 getCapacityByWebsiteId(data: any) {
  console.log(data);

  let params = new HttpParams()
    .set('entityId', data.entityId)
    .set('entityType', data.entityType)
    .set('websiteId', data.websiteId)
    .set('type', data.type);

  if (data.mode) {
    params = params.set('mode', data.mode);
  }

  return this.http.get(
    `${baseUrl}/transaction-capacity`,
    { params }
  );
}

}
