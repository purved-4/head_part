import { HttpClient } from "@angular/common/http";
import { Injectable, NgZone } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";
import { EventSourcePolyfill } from "event-source-polyfill";

@Injectable({
  providedIn: "root",
})
export class PoolingService {
  private eventSource: EventSourcePolyfill | null = null;

  constructor(private http: HttpClient, private zone: NgZone) {}

  AdminPooling(): Observable<any> {
    return this.http.get<any>(`${baseUrl}/branch/getAllData`).pipe(
      map((response: any) => response.data),
      catchError((error) => throwError(() => error))
    );
  }

  AgentPooling(websiteId: any): Observable<any> {
    return this.http
      .get<any>(`${baseUrl}/branch/getAllData/${websiteId}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => throwError(() => error))
      );
  }

  // STREAM FUNDS — Infinite SSE
  fundData(branchId: any): Observable<any> {
    return new Observable((observer) => {
      const eventSource = new EventSourcePolyfill(
        `${baseUrl}/webhook/streamFunds/${branchId}`,
        { withCredentials: true }
      );

      eventSource.addEventListener("new-data", (event: any) => {
        this.zone.run(() => observer.next(JSON.parse(event.data)));
      });

      eventSource.addEventListener("keep-alive", () => {});

      eventSource.onerror = (error) => {
        console.warn("Funds SSE: Reconnecting automatically...");
        // ❌ No close, no observer.error
      };

      return () => eventSource.close();
    });
  }

  // PENDING DATA — Infinite SSE
  branchData(branchId: string): Observable<any> {
    return new Observable((observer) => {
      const connect = () => {
        this.eventSource = new EventSourcePolyfill(
          `${baseUrl}/topic/pendingData/${branchId}`,
          { withCredentials: true }
        );

        this.eventSource.addEventListener("new-data", (event: any) => {
          this.zone.run(() => {
            try {
              observer.next(JSON.parse(event.data));
            } catch {
              observer.next(event.data);
            }
          });
        });

        this.eventSource.addEventListener("keep-alive", () => {});

        this.eventSource.onerror = () => {
          console.warn("Pending SSE: Auto reconnecting...");
          // ❌ Neither close nor error.emit
        };
      };

      connect();

      return () => this.closeConnection();
    });
  }


   listenForChatUpdates(userId: string): Observable<any> {
    return new Observable((observer) => {
      const connect = () => {
        this.eventSource = new EventSourcePolyfill(
          `${baseUrl}/api/chat/stream/${userId}`,
          { withCredentials: true }
        );

 
         this.eventSource.addEventListener("new-data", (event: any) => {
          this.zone.run(() => {
            try {
              observer.next(JSON.parse(event.data));
            } catch {
              observer.next(event.data);
            }
          });
        });

        // Ignore ping/heartbeat
        this.eventSource.addEventListener("keep-alive", () => {});

        // Auto retry forever
        this.eventSource.onerror = (error: any) => {
          console.warn("SSE lost — retrying automatically...", error);
          // ❌ DO NOT close
          // ❌ DO NOT increment attempt
          // ❌ DO NOT observer.error()
         };
      };

      connect();

      return () => {
         this.eventSource?.close();
        this.eventSource = null;
      };
    });
  }

  getRealTimeMessageByThreadId(threadId: string): Observable<any> {
    return new Observable((observer) => {
      const connect = () => {
        this.eventSource = new EventSourcePolyfill(
          `${baseUrl}/api/chat/stream/messages/${threadId}`,
          { withCredentials: true }
        );

        this.eventSource.addEventListener("message", (event: any) => {
          this.zone.run(() => {
            try {
           

              observer.next(JSON.parse(event.data));
            } catch {
              observer.next(event.data);
            }
          });
        });

        this.eventSource.addEventListener("keep-alive", () => {});

        this.eventSource.onerror = () => {
          console.warn("Pending SSE: Auto reconnecting...");
          // ❌ Neither close nor error.emit
        };
      };

      connect();

      return () => this.closeConnection();
    });
  }

 


  

  private closeConnection() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}