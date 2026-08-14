
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { Subscription, interval } from "rxjs";
import {
  TimeZoneOption,
  TimeZoneServiceService,
  TimeZoneState,
} from "./time-zone-service.service";

@Component({
  selector: "app-time-zone",
  templateUrl: "./time-zone.component.html",
  styleUrls: ["./time-zone.component.css"],
})
export class TimeZoneComponent implements OnInit, OnDestroy {
  @ViewChild("dropdownWrap", { static: false })
  dropdownWrap?: ElementRef<HTMLElement>;

  isOpen = false;
  zones: TimeZoneOption[] = [];
  currentState!: TimeZoneState;

  now = new Date();
  private timerSub?: Subscription;
  private stateSub?: Subscription;

  constructor(public timeZoneService: TimeZoneServiceService) {}

  ngOnInit(): void {
    this.zones = this.timeZoneService.getAvailableTimeZones();
    this.currentState = this.timeZoneService.getCurrentState();

    this.stateSub = this.timeZoneService.timeZone$.subscribe((state) => {
      this.currentState = state;
    });

    this.timerSub = interval(1000).subscribe(() => {
      this.now = new Date();
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.stateSub?.unsubscribe();
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  selectZone(zone: TimeZoneOption): void {
    this.timeZoneService.setTimeZone(zone);
    this.isOpen = false;
  }

  useSystem(): void {
    this.timeZoneService.useSystemTimeZone();
    this.isOpen = false;
  }

  isSelected(zone: TimeZoneOption): boolean {
    return (
      this.currentState?.code === zone.code ||
      this.currentState?.iana === zone.iana
    );
  }

  getSelectedLocalTime(): string {
    return this.formatNoSeconds(
      this.now,
      this.currentState?.iana || this.timeZoneService.getActiveTimeZone(),
    );
  }

  getUtcTime(): string {
    return this.formatNoSeconds(this.now, "UTC");
  }

  getZoneLocalTime(zone: TimeZoneOption): string {
    const iana =
      zone.mode === "SYSTEM"
        ? this.timeZoneService.getSystemTimeZone()
        : zone.iana;

    return this.formatNoSeconds(this.now, iana);
  }

  getZoneUtcTime(zone: TimeZoneOption): string {
    return this.formatNoSeconds(this.now, "UTC");
  }

  formatNoSeconds(value: Date, timeZone: string): string {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(value);
  }

  /**
   * Live clock (no date, includes seconds) for whichever timezone
   * is currently selected. Shown on the trigger button/pill.
   */
  getSelectedTimeOnly(): string {
    const tz =
      this.currentState?.iana || this.timeZoneService.getActiveTimeZone();
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(this.now);
  }

  /**
   * Human readable label for whichever timezone is currently selected.
   * Useful if you want to show the zone name next to the clock.
   */
  getSelectedZoneLabel(): string {
    if (this.currentState?.mode === "SYSTEM") {
      return "System";
    }
    return this.currentState?.label || this.currentState?.code || "";
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target || !this.dropdownWrap?.nativeElement.contains(target)) {
      this.isOpen = false;
    }
  }
}
