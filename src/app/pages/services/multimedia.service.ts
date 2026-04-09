import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { fileBaseUrl } from './helper';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MultimediaService {

  constructor(private http: HttpClient) { }

  getPrivateImage(fileId: string): Observable<string> {
    return this.http.get(
      `${fileBaseUrl}/${fileId}`,
      { responseType: 'blob' }
    ).pipe(
      map(blob => URL.createObjectURL(blob))
    );
  }

  getImageByUrl(url: string): Observable<string> {
    return this.http.get(
      `${url}`,
      { responseType: 'blob' }
    ).pipe(
      map(blob => URL.createObjectURL(blob))
    );
  }




  getImageByUrlBlob(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  revokeObjectUrl(objectUrl: any): void {
    URL.revokeObjectURL(objectUrl);
  }
}
