import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { fileBaseUrl } from './helper';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MultimediaService {

  constructor( private http: HttpClient) { }

  getPrivateImage(fileId: string): Observable<string> {
  return this.http.get(
    `${fileBaseUrl}/${fileId}`,
    { responseType: 'blob' }
  ).pipe(
    map(blob => URL.createObjectURL(blob))
  );
}
}
