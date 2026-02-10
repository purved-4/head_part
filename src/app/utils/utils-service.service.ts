import { Injectable } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { HttpClient } from "@angular/common/http";
import baseUrl from "../pages/services/helper";
import { ManagerService } from "../pages/services/manager.service";
import { WebsiteService } from "../pages/services/website.service";
import { HeadService } from "../pages/services/head.service";
import { BranchService } from "../pages/services/branch.service";
import { ChiefService } from "../pages/services/chief.service";

@Injectable({
  providedIn: "root",
})
export class UtilsServiceService {

  constructor(
    private http: HttpClient,
    private cnfService: ChiefService,
    private whoService: ManagerService,
    private headService: HeadService,
    private userService: BranchService,
    private websiteService: WebsiteService
  ) {}

  getDataWithEntityTypeAndId(
    id: any,
    type: any,
    cheifToogle: any = "manager"
  ): Observable<any[]> {
    switch (type.toString().toLowerCase()) {
      case "owner":
        return this.cnfService.getChiefsListByUserId(id).pipe(
          map((res) => res),
          catchError((err) => throwError(() => err))
        );

      case "chief":
        if (cheifToogle === "manager") {
          return this.whoService.getManagersByChiefId(id).pipe(
            map((res) => res),
            catchError((err) => throwError(() => err))
          );
        } else {
          return this.userService.getBranchWithHeadId(id).pipe(
            map((res) => res),
            catchError((err) => throwError(() => err))
          );
        }
      case "manager":
        return this.headService.getHeadByManagerId(id).pipe(
          map((res) => res),
          catchError((err) => throwError(() => err))
        );

      case "head":
        return this.userService.getBranchWithHeadId(id).pipe(
          map((res) => res),
          catchError((err) => throwError(() => err))
        );

      default:
        return throwError(() => new Error("Invalid user type"));
    }
  }

  getRoleForDownLevelWithCurrentRoleId(type: String) {
    switch (type.toLowerCase()) {
      case "owner":
        return "chief";

      case "chief":
        return "manager";

      case "manager":
        return "head";

      case "head":
        return "branch";

      default:
        return throwError(() => new Error("Invalid user type"));
    }
  }

  getRoleForDownLevelWithCurrentRoleIdAll(type: any) {
    switch (type.toString().toLowerCase()) {
      case "owner":
        return [
          { id: "owner", name: "Owner", value: "owner" },
          { id: "chief", name: "Chief Controller", value: "chief" },
          { id: "manager", name: "Manager", value: "manager" },
          { id: "head", name: "Head", value: "head" },
          { id: "branch", name: "Branch", value: "branch" },
        ];

      case "chief":
        return [
          { id: "chief", name: "Chief Controller", value: "chief" },
          { id: "manager", name: "Manager", value: "manager" },
          { id: "head", name: "Head", value: "head" },
          { id: "branch", name: "Branch", value: "branch" },
        ];

      case "manager":
        return [
          { id: "manager", name: "Manager", value: "manager" },
          { id: "head", name: "Head", value: "head" },
          { id: "branch", name: "Branch", value: "branch" },
        ];

      case "head":
        return [
          { id: "head", name: "Head", value: "head" },
          { id: "branch", name: "Branch", value: "branch" },
        ];

      default:
        return throwError(() => new Error("Invalid user type"));
    }
  }

  getWebsiteByRoleIdAndRoleName(id: any, roleName: any): Observable<any[]> {
    switch (roleName.toString().toLowerCase()) {
      case "owner":
        return this.websiteService.getAllWebsiteByAdminId(id).pipe(
          map((res) => res),
          catchError((err) => throwError(() => err))
        );

      case "chief":
        return this.cnfService.getAllWebsitesByChiefId(id).pipe(
          map((res) => res),
          catchError((err) => throwError(() => err))
        );

      case "manager":
        return this.whoService.getWebsiteByChiefId(id).pipe(
          map((res) => res),
          catchError((err) => throwError(() => err))
        );

      case "head":
        return this.headService.getAllHeadsWithWebsitesById(id).pipe(
          map((res) => res),
          catchError((err) => throwError(() => err))
        );

      case "branch":
        return this.userService.getWebsiteByBranchId(id).pipe(
          map((res) => res),
          catchError((err) => throwError(() => err))
        );

      default:
        return throwError(() => new Error("Invalid user type"));
    }
  }

  getBalanceHisotryByTypeAndId(type: any, id: any): Observable<any[]> {
    return this.http.get<any[]>(
      `${baseUrl}/balance-history/getByEntityTypeAndId/${type}/${id}`
    );
  }

  getOwnerBalance(): Observable<any[]> {
    return this.http.get<any[]>(`${baseUrl}/balance-history/getOwnerBalance`);
  }
}