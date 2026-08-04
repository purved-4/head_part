import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TimeRemaining {
  hours: string;
  minutes: string;
  seconds: string;
}

@Component({
  selector: 'app-maintenance-notice',
  templateUrl: './maintenance-notice.component.html',
})
export class MaintenanceNoticeComponent implements OnInit, OnDestroy {
  /** Heading shown in the card. */
  @Input() title = 'Scheduled maintenance in progress';
  /** Supporting copy shown under the heading. */
  @Input() message =
    "We're upgrading this part of the app to make it faster and more reliable.";
  /**
   * Hour (0-23) that maintenance is expected to end, tomorrow, in the
   * *viewer's own* local timezone. Because we build the target with the
   * Date constructor's local-time fields (not UTC), every visitor sees a
   * countdown to "tomorrow" as measured on their own clock, regardless of
   * where they are in the world.
   */
  @Input() targetHour = 9;
  @Input() targetMinute = 0;

  timeRemaining: TimeRemaining = { hours: '00', minutes: '00', seconds: '00' };
  resolvedTargetLabel = '';
  isComplete = false;
  progress = 70;

  private targetDate!: Date;
  private timerId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.targetDate = this.computeTomorrowAt(this.targetHour, this.targetMinute);
    this.resolvedTargetLabel = this.formatTargetLabel(this.targetDate);
    this.tick();
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  /** Builds "tomorrow" using local date/time fields so each viewer's own timezone is respected. */
  private computeTomorrowAt(hour: number, minute: number): Date {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      hour,
      minute,
      0,
      0
    );
  }

  private formatTargetLabel(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private tick(): void {
    const diff = this.targetDate.getTime() - Date.now();

    if (diff <= 0) {
      this.timeRemaining = { hours: '00', minutes: '00', seconds: '00' };
      this.isComplete = true;
      if (this.timerId) {
        clearInterval(this.timerId);
      }
      return;
    }

    let remaining = diff;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    remaining -= hours * 1000 * 60 * 60;
    const minutes = Math.floor(remaining / (1000 * 60));
    remaining -= minutes * 1000 * 60;
    const seconds = Math.floor(remaining / 1000);

    this.timeRemaining = {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    };
  }
}