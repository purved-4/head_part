import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, catchError, map, throwError } from "rxjs";
import baseUrl from "./helper";


@Injectable({
  providedIn: 'root'
})
export class CurrencyService {

    constructor(private http: HttpClient) {}


        getCustomCurrencies(entityId: string | number, entityType: string) {
  return this.http.get(
    `${baseUrl}/chief/currencies/custom/${entityId}/${entityType}`
  );
}

// createCustomCurrency(
//   entityId: string | number,
//   entityType: string,
//   chiefCurrencyId: string,
//   currency: string,
//   overrideRate: number,
//   effectiveFrom: Date | string,
//   active: boolean
// ) {
//   const payload = {
//     entityId,
//     entityType,
//     chiefCurrencyId,
//     currency,
//     overrideRate,
//     effectiveFrom:
//       typeof effectiveFrom === 'string'
//         ? effectiveFrom
//         : new Date(effectiveFrom).toISOString(),
//     active,
//   };

//   return this.http.post(
//     `${baseUrl}/chief/currencies/custom`,
//     payload
//   );
// }

createCustomCurrency(payload: any) {
  return this.http.post(
    `${baseUrl}/chief/currencies/custom`,
    payload
  );
}
}
