import { Injectable, NgZone } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export type SnackbarType = "success" | false | "warning";

export interface SnackbarPayload {
  message: string;
  type?: SnackbarType;
  duration?: number;
}

@Injectable({
  providedIn: "root",
})
export class SnackbarService {
  private queue: SnackbarPayload[] = [];

  private currentSubject =
    new BehaviorSubject<SnackbarPayload | null>(null);

  current$ = this.currentSubject.asObservable();

  private timeoutId: any;

  constructor(private ngZone: NgZone) {}

  show(
    message: string,
    type: any,
    duration = 4000
  ) {

    if (type === true) {
      type = "success";
    } else {
      type = false;
    }

    this.queue.push({
      message,
      type,
      duration,
    });

    this.processQueue();
  }

  private processQueue() {

    // already showing snackbar
    if (this.currentSubject.value) {
      return;
    }

    const next = this.queue.shift();

    if (!next) {
      return;
    }

    this.ngZone.run(() => {
      this.currentSubject.next(next);
    });

    // SSR SAFE
    this.timeoutId = setTimeout(() => {
      this.hide();
    }, next.duration ?? 4000);
  }

  hide() {

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.ngZone.run(() => {
      this.currentSubject.next(null);
    });

    setTimeout(() => {
      this.processQueue();
    }, 180);
  }

  clearAll() {
    this.queue = [];
    this.hide();
  }
}