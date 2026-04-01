import { Injectable } from "@angular/core";
import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from "@angular/common/http";
import { Observable, of, tap } from "rxjs";
import { HttpCacheService } from "./http-cache.service";
import { buildCacheKey } from "../utils/cache-key.util";

@Injectable()
export class AuthCacheInterceptor implements HttpInterceptor {
  private readonly TTL = 60 * 1000; // 1 min

  constructor(private cache: HttpCacheService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // ✅ STEP 1: Add Auth (withCredentials)
    const authReq = req.clone({
      withCredentials: true,
    });

    //  Skip cache for non-GET
    if (authReq.method !== "GET") {
      return next.handle(authReq);
    }

    // 🔑 Build cache key
    const key = buildCacheKey(authReq);

    // 🚀 Check cache
    const cached = this.cache.get(key);
    if (cached) {
      return of(cached);
    }

    // 🌐 API call + cache store
    return next.handle(authReq).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          const tag = this.getTag(authReq);
          this.cache.set(key, event, this.TTL, tag);
        }
      }),
    );
  }

  private getTag(req: HttpRequest<any>): string {
    const url = req.url;

    if (url.includes("/banks/getAllByEntityIdAndPortalId")) {
      const parts = url.split("/");
      const id = parts[parts.length - 2];
      const portalId = parts[parts.length - 1];

      return `BANKS:${id}:${portalId}`;
    }

    return "DEFAULT";
  }
}
