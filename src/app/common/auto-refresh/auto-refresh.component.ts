import { Component, Input, OnDestroy } from "@angular/core";

@Component({
  selector: "app-auto-refresh",
  templateUrl: "./auto-refresh.component.html",
})
export class AutoRefreshComponent implements OnDestroy {
  @Input() refreshFn!: () => void;

  interval: number | null = null; //  default = "Select"
  timer: any = null;
  intervals: number[] = [10, 20, 30, 60];

  //  Called when dropdown changes
  changeInterval(): void {
    this.clearTimer();

    // 👉 If "Select" (null), do nothing
    if (!this.interval) return;

    this.startTimer();
  }

  startTimer(): void {
    this.callRefresh(); // immediate first call

    this.timer = setInterval(() => {
      this.callRefresh();
    }, this.interval! * 1000);
  }

  private callRefresh(): void {
    try {
      this.refreshFn?.();
    } catch (error) {
      this.clearTimer();
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