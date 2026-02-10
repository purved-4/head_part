import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SnackbarType = 'success' | false | 'warning';

export interface SnackbarPayload {
  message: string;
  type?: SnackbarType;
  duration?: number; // milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private queue: SnackbarPayload[] = [];
  private currentSubject = new BehaviorSubject<SnackbarPayload | null>(null);
  current$ = this.currentSubject.asObservable();

  private timeoutId: any;

  constructor(private ngZone: NgZone) {}

  /**
   * Enqueue and show a snackbar.
   * @param message text to show
   * @param type success|error|warning
   * @param duration how long to show in ms (default 4000)
   */
  show(message: string, type: any, duration = 4000) {
    if(type === true){
      type = 'success';
    }
    else{
      type = false;
    }
    this.queue.push({ message, type, duration });
    this.processQueue();
  }

 

  private processQueue() {
    // if a snackbar is currently visible, wait
    if (this.currentSubject.value) return;

    const next = this.queue.shift();
    if (!next) return;

    // Ensure we emit inside Angular zone to avoid update-mode assertions
    this.ngZone.run(() => {
      this.currentSubject.next(next);
    });

    // Auto-hide after duration
    this.timeoutId = window.setTimeout(() => {
      this.hide();
    }, next.duration ?? 4000);
  }

  hide() {
    // clear any running timer
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    // hide inside Angular zone
    this.ngZone.run(() => {
      this.currentSubject.next(null);
    });

    // small delay to allow any exit animation before showing next item
    setTimeout(() => {
      this.processQueue();
    }, 180);
  }

  /** Immediately clear queue and hide current snackbar */
  clearAll() {
    this.queue = [];
    this.hide();
  }
}
