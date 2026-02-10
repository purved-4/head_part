import { Role } from './../../store/current-user-model';
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";


@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  updateUser(userId:any,userData:any){
     return this.http.patch(
      `${baseUrl}/updateUser/${userId}`,
      userData
    );
  }

  updateUserPassword(data:any){
     return this.http.patch(
      `${baseUrl}/changePassword`,
      data
    );
  }

  getByRole(id:any,role:any) {
    return this.http.get(
      `${baseUrl}/getEntityIdByUserId?role=${role}&id=${id}`,
    );
  }

  getUserFullDetail(id:any) {
    return this.http.get(
      `${baseUrl}/getUserInfo/${id}`,
    ).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        console.error('Error fetching user full detail:', error);
        return throwError(() => error);
      })
    );
  }


  getAllLoginedUsers() {
    return this.http.get(
      `${baseUrl}/work-reports/active-users`,
    ).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        console.error('Error fetching user full detail:', error);
        return throwError(() => error);
      })
    );
  }

  

  // getByRole(role:any) {
  //   return this.http.get(
  //     `${baseUrl}/getEntityIdByUserId?role=${role}&id=${id}`,
  //   );
  // }




  
}
