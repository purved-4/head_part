import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare const turnstile: any;

@Injectable({ providedIn: 'root' })
export class TurnstileService implements OnDestroy {

  private tokenSubject = new BehaviorSubject<string | null>(null);
  token$ = this.tokenSubject.asObservable();

  private widgetId: any = null;

  constructor(private zone: NgZone) {}

  get token(): string | null {
    return this.tokenSubject.getValue();
  }

  render(container: HTMLElement, siteKey: string): void {
    if (typeof turnstile === 'undefined') {

      return;
    }

    // Already rendered — skip
    if (this.widgetId !== null) return;

    this.widgetId = turnstile.render(container, {
      sitekey: siteKey,
      theme: 'light',
      callback: (token: string) => {
        this.zone.run(() => this.tokenSubject.next(token));
      },
      'expired-callback': () => {
        this.zone.run(() => this.tokenSubject.next(null));
      },
      'error-callback': () => {
        this.zone.run(() => this.tokenSubject.next(null));
      },
    });
  }

  reset(): void {
    if (typeof turnstile !== 'undefined' && this.widgetId !== null) {
      turnstile.reset(this.widgetId);
    }
    this.tokenSubject.next(null);
  }

  remove(): void {
    if (typeof turnstile !== 'undefined' && this.widgetId !== null) {
      turnstile.remove(this.widgetId);
      this.widgetId = null;
    }
    this.tokenSubject.next(null);
  }

  ngOnDestroy(): void {
    this.remove();
  }
}