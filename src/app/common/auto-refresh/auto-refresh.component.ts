import { Component, Input, OnDestroy } from "@angular/core";

@Component({
  selector: "app-auto-refresh",
  templateUrl: "./auto-refresh.component.html",
  styleUrls: ["./auto-refresh.component.css"],
})
export class AutoRefreshComponent implements OnDestroy {
  @Input() refreshFn!: () => void;

  isActive: boolean = false;
  interval: number = 10;
  timer: any;

  intervals: number[] = [10, 20, 30, 60];

  toggleAutoRefresh(): void {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.startTimer();
    } else {
      this.clearTimer();
    }
  }

  changeInterval(): void {
    if (this.isActive) {
      this.startTimer();
    }
  }

  startTimer(): void {
    this.clearTimer();

    this.callRefresh();

    this.timer = setInterval(() => {
      this.callRefresh();
    }, this.interval * 1000);
  }

  private callRefresh(): void {
    try {
      if (this.refreshFn) {
        this.refreshFn();
      }
    } catch (error) {
      this.clearTimer();
      this.isActive = false;
    }
  }

  clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
