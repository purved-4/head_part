// src/app/services/state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppIds {
  orgId: string;
  userId: string;
  panelId: string;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private idsSubject = new BehaviorSubject<AppIds | null>(null);
  ids$ = this.idsSubject.asObservable();

  setIds(ids: AppIds) {
    this.idsSubject.next(ids);
  }

  get idsSnapshot(): AppIds | null {
    return this.idsSubject.value;
  }

  clear() {
    this.idsSubject.next(null);
  }
}
