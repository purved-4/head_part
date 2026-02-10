import { HttpClient } from "@angular/common/http";
import { Injectable, NgZone } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import baseUrl from "./helper";
import { EventSourcePolyfill } from "event-source-polyfill";
import { AnyARecord } from "node:dns";

@Injectable({
  providedIn: "root",
})
export class NotificationChatService {
  constructor(
    private http: HttpClient,
    private zone: NgZone,
  ) {}

  // SEND MESSAGE
  sendChatNotification(payload: any): Observable<any> {
    return this.http
      .post(`${baseUrl}/api/chat/send`, payload, {
        withCredentials: true,
      })
      .pipe(map((res: any) => res.data));
  }

  // GET CHAT HISTORY
  getThreadHistory(threadId: string): Observable<any> {
    return this.http
      .get(`${baseUrl}/api/chat/${threadId}/history`, {
        withCredentials: true,
      })
      .pipe(map((res: any) => res.data));
  }

  getThreadByBranchId(branchId: string, type: any): Observable<any> {
    return this.http
      .get(`${baseUrl}/api/chat/findThread/${branchId}/${type}`)
      .pipe(
        map((res: any) => res.data),
        catchError((err) => throwError(err)),
      );
  }

  // getThreadByBranchIdWithIsResolved(branchId: string,type:any,isResolved:any): Observable<any> {
  //   return this.http
  //     .get(
  //       `${baseUrl}/api/chat/findThread/${branchId}/${type}/${isResolved}`,
  //     )
  //     .pipe(
  //       map((res: any) => res.data),
  //       catchError((err) => throwError(err))
  //     );
  // }

  getThreadByBranchIdWithIsResolved(
    branchId: string,
    entityType: any,
    isResolved: any,
    type?: any,
  ): Observable<any> {
    if (type === undefined || type === null) {
      type = "all";
    }

    return this.http
      .get(
        `${baseUrl}/api/chat/findThread/${branchId}/${entityType}/${isResolved}/${type}`,
      )
      .pipe(
        map((res: any) => res.data),
        catchError((err) => throwError(err)),
      );
  }

  getThreadByBranchIdWithIsResolvedPaginated(
    branchId: string,
    entityType: any,
    isResolved: any,
    type?: any,
    page: number = 0,
    size: number = 20,
  ): Observable<any> {
    if (type === undefined || type === null) {
      type = "all";
    }

    return this.http
      .get(
        `${baseUrl}/api/chat/findThread/paginated/${branchId}/${entityType}/${isResolved}/${type}`,
        {
          params: {
            page: page.toString(),
            size: size.toString(),
          },
        },
      )
      .pipe(
        map((res: any) => res.data),
        catchError((err) => throwError(err)),
      );
  }

  

  getThreadByHeadIdAndIsResolved(
    branchId: string,
    entityType: any,
    isResolved: any,
    type?: any,
  ): Observable<any> {
    if (type === undefined || type === null) {
      type = "all";
    }

    return this.http
      .get(
        `${baseUrl}/api/chat/findThreadOfHead/${branchId}/${entityType}/${isResolved}/${type}`,
      )
      .pipe(
        map((res: any) => res.data),
        catchError((err) => throwError(err)),
      );
  }

  getAllThreadForHeadAndBranch(
    branchId: string,
    entityType: any,
    isResolved: any,
    type?: any,
  ): Observable<any> {
    if (type === undefined || type === null) {
      type = "all";
    }

    return this.http
      .get(
        `${baseUrl}/api/chat/findThreadCombined/${branchId}/${entityType}/${isResolved}/${type}`,
      )
      .pipe(
        map((res: any) => res.data),
        catchError((err) => throwError(err)),
      );
  }

  sendChatMessage(threadId: any, payload: any): Observable<any> {
    return this.http
      .post(`${baseUrl}/api/chat/${threadId}/message`, payload)
      .pipe(map((res: any) => res.data));
  }

  getMessageByThreadId(
    threadId: any,
    branch: any,
    page: any,
    size: any,
  ): Observable<any> {
    return this.http
      .get(
        `${baseUrl}/api/chat/findMessageByThreadId/${threadId}/${branch}?page=${page}&size=${size}`,
      )
      .pipe(map((res: any) => res.data.content));
  }

  getChatMembersByThreadId(threadId: any): Observable<any> {
    return this.http
      .get(`${baseUrl}/api/chat/findMemberByThreadId/${threadId}`)
      .pipe(map((res: any) => res.data));
  }

   uploadAttachment(
    threadId: string,
    file: File
  ): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(
      `${baseUrl}/api/chat/upload/${threadId}`,
      formData
    ).pipe(map((res: any) => res.data));
  }

 

   getFileDownloadUrl(fileId: any): Observable<any> {
    return this.http
      .get(`${baseUrl}/api/files/private/${fileId}`)
      .pipe(map((res: any) => res.data));
  }

}
