import { Injectable } from "@angular/core";
import { map, Observable, throwError } from "rxjs";
import { fileBaseUrl } from "./helper";
import { HttpClient } from "@angular/common/http";
import { UserStateService } from "../../store/user-state.service";

@Injectable({
  providedIn: "root",
})
export class MultimediaService {
  constructor(
    private http: HttpClient,
    private userStateService: UserStateService,
  ) {}

  getPrivateImage(fileId: string): Observable<string> {
    const entityId = this.userStateService.getCurrentEntityId();

    if (!entityId) {
      return throwError(() => new Error("Entity ID not found"));
    }

    return this.http
      .get(`${fileBaseUrl}/${fileId}/${entityId}`, { responseType: "blob" })
      .pipe(map((blob) => URL.createObjectURL(blob)));
  }

  getImageByUrl(url: string): Observable<string> {
    return this.http
      .get(`${url}`, { responseType: "blob" })
      .pipe(map((blob) => URL.createObjectURL(blob)));
  }

  getImageByUrlBlob(url: string): Observable<Blob> {
    const entityId = this.userStateService.getCurrentEntityId();

    if (!entityId) {
      return throwError(() => new Error("Entity ID not found"));
    }

    return this.http.get(`${url}/${entityId}`, { responseType: "blob" });
  }

  revokeObjectUrl(objectUrl: any): void {
    URL.revokeObjectURL(objectUrl);
  }
}
