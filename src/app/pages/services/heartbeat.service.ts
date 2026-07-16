import { Injectable, OnDestroy, Inject, PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { isPlatformBrowser } from "@angular/common";
import baseUrl from "./helper";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class HeartbeatService implements OnDestroy {
  private intervalId: any = null;
  private visibilityFn?: () => void; // ← change karo
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // document sirf browser pe exist karta hai
    if (this.isBrowser) {
      this.visibilityFn = () => {
        document.hidden ? this.stop() : this.start();
      };
      document.addEventListener("visibilitychange", this.visibilityFn);
    }
  }

  start(): void {
    if (!this.isBrowser) return; // Server pe kuch mat karo
    if (this.intervalId) return; // Already running

    // this.send();
    // this.intervalId = setInterval(() => this.send(), 30_000);
  }

  stop(): void {
    if (!this.isBrowser) return;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // private send(): void {
  //   this.http.post(`${baseUrl}/api/heartbeat`, {}).subscribe({
  //     error: () => {},
  //   });
  // }

  ngOnDestroy(): void {
    this.stop();
    if (this.isBrowser && this.visibilityFn) {
      document.removeEventListener("visibilitychange", this.visibilityFn);
    }
  }

  ownerHeartbeat(ownerId: any): Observable<any> {
    return this.http.get(`${baseUrl}/api/activity/owner/${ownerId}/all`, {});
  }
  chiefHeartbeat(chiefId: any): Observable<any> {
    return this.http.get(`${baseUrl}/api/activity/chief/${chiefId}/users`, {});
  }
  managerHeartbeat(managerId: any): Observable<any> {
    return this.http.get(
      `${baseUrl}/api/activity/manager/${managerId}/users`,
      {},
    );
  }
  headHeartbeat(headId: any): Observable<any> {
    return this.http.get(`${baseUrl}/api/activity/head/${headId}/users`, {});
  }
  branchHeartbeat(branchId: any): Observable<any> {
    return this.http.get(
      `${baseUrl}/api/activity/branch/${branchId}/users`,
      {},
    );
  }
}
