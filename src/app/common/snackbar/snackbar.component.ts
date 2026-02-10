import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {  SnackbarPayload, SnackbarService } from './snackbar.service';

@Component({
  selector: 'app-snackbar',
  templateUrl: './snackbar.component.html',
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.25s ease-out forwards;
    }
    .animate-fadeOut {
      animation: fadeOut 0.18s ease-in forwards;
    }
  `]
})
export class SnackbarComponent implements OnDestroy {
  // explicitly nullable so the template knows it might be null
  snackbar: SnackbarPayload | null = null;
  isExiting = false;

  private sub!: Subscription;

  constructor(
    private snackbarService: SnackbarService,
    // private cdr: ChangeDetectorRef
  ) {
    this.sub = this.snackbarService.current$.subscribe(payload => {
      this.isExiting = false;
      this.snackbar = payload;
      // try { this.cdr.detectChanges(); } catch { /* ignore detection errors */ }
    });
  }

  close() {
    this.isExiting = true;
    // try { this.cdr.detectChanges(); } catch { /* ignore */ }
    setTimeout(() => this.snackbarService.hide(), 160);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
