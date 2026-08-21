import { Injectable } from "@angular/core";
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from "@angular/common/http";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import { LoaderService } from "../pages/services/loader.service";

const SKIP_LOADER_URLS = ["/api/auth/refresh", "/api/health-check"];
const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  constructor(private loaderService: LoaderService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const shouldSkip =
      SKIP_LOADER_URLS.some((url) => req.url.includes(url)) ||
      req.headers.has("X-Skip-Loader");

    if (shouldSkip) {
      return next.handle(req);
    }

    if (req.method === "GET") {
      if (this.loaderService.hasPendingKey()) {
        this.loaderService.showButtonLoader();
        return next
          .handle(req)
          .pipe(finalize(() => this.loaderService.hideButtonLoader()));
      }

      this.loaderService.show();
      return next.handle(req).pipe(finalize(() => this.loaderService.hide()));
    }

    if (MUTATION_METHODS.includes(req.method)) {
      this.loaderService.showButtonLoader();
      return next
        .handle(req)
        .pipe(finalize(() => this.loaderService.hideButtonLoader()));
    }

    return next.handle(req);
  }
}
