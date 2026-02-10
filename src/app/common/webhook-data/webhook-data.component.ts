import { Component, OnDestroy } from '@angular/core';
import { timer, Subject, of } from 'rxjs';
import { switchMap, takeUntil, catchError, tap } from 'rxjs/operators';
import { PoolingService } from '../../pages/services/pooling.service';

@Component({
  selector: 'app-webhook-data',
  templateUrl: './webhook-data.component.html',
  styleUrls: ['./webhook-data.component.css']
})
export class WebhookDataComponent implements OnDestroy {
  // latest parsed payload (object) from the first item (or null)
  latestPayload: any = null;

  // latest other fields (object) without payload
  latestOther: any = null;

  // array of items returned from polling (keeps whole list if you need it)
  items: any[] = [];

  // loading / error flags for UI
  isLoading = false;
  errorMessage: string | null = null;
  objectKeys = Object.keys;

  private destroy$ = new Subject<void>();

  constructor(private poolingService: PoolingService) {
    const poll$ = timer(0, 5000).pipe( // immediate first tick, then every 5s
      tap(() => {
        this.isLoading = true;
        this.errorMessage = null;
      }),
      switchMap(() =>
        this.poolingService.AdminPooling().pipe(
          tap((resp) => 
             console.log(resp)
          ),
          catchError((err) => {
             this.errorMessage = err?.message || JSON.stringify(err);
             return of([]);
          })
        )
      ),
      takeUntil(this.destroy$)
    );

    // subscribe to polling and update UI state
    poll$.subscribe((data: any) => {
      this.isLoading = false;

      // depending on your service, data may already be the array or object
      this.items = Array.isArray(data) ? data : (data ? [data] : []);

      if (this.items.length > 0) {
        const first = this.items[0];

        // keep other fields (shallow copy) and remove payload for display
        const other = { ...first };
        delete other.payload;
        this.latestOther = other;

        // parse payload if it's a JSON string; otherwise keep raw
        try {
          // payload might be already an object or a JSON string
          if (typeof first.payload === 'string') {
            this.latestPayload = JSON.parse(first.payload);
          } else {
            this.latestPayload = first.payload;
          }
        } catch (parseErr) {
          console.error('Failed to parse payload JSON:', parseErr);
          // fallback to raw payload string
          this.latestPayload = first.payload;
        }

        
      } else {
        // no items returned
        this.latestPayload = null;
        this.latestOther = null;
      }
    });
  }

  // manual refresh if you want to trigger a polling request from UI
  refreshNow() {
    // simple hack: call the service once and merge the behaviour with polling
    this.isLoading = true;
    this.poolingService.AdminPooling().pipe(
      tap((resp) => 
        console.log(resp)
       ),
      catchError((err) => {
        console.error('Manual refresh error:', err);
        this.errorMessage = err?.message || JSON.stringify(err);
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe((data: any) => {
      this.isLoading = false;
      this.items = Array.isArray(data) ? data : (data ? [data] : []);
      if (this.items.length > 0) {
        const first = this.items[0];
        const other = { ...first };
        delete other.payload;
        this.latestOther = other;
        try {
          this.latestPayload = typeof first.payload === 'string' ? JSON.parse(first.payload) : first.payload;
        } catch {
          this.latestPayload = first.payload;
        }
      } else {
        this.latestPayload = null;
        this.latestOther = null;
      }
    });
  }

  ngOnDestroy(): void {
    // stop polling
    this.destroy$.next();
    this.destroy$.complete();
  }
}
