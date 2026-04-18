import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { SubjectRegistryService } from "../../registery/subject-registry.service";

export type TimeZoneMode = "SYSTEM" | "CUSTOM";

export interface TimeZoneOption {
  code: string;
  label: string;
  iana: string;
  mode: TimeZoneMode;
}

export interface TimeZoneState {
  code: string;
  mode: TimeZoneMode;
  label: string;
  iana: string;
  offsetLabel: string;
}

export interface ReportRangeResult {
  fromUtc: string;
  toUtc: string;
  timeZone: string;
  fromLocal: string;
  toLocal: string;
}

@Injectable({
  providedIn: "root",
})
export class TimeZoneServiceService {
  private readonly STORAGE_KEY = "GLOBAL_TIME_ZONE";
  private readonly TIME_ZONE_KEY = "TIME_ZONE";

  private readonly commonZones: TimeZoneOption[] = [
    { code: "ASIA_KOLKATA", label: "India (IST)", iana: "Asia/Kolkata", mode: "CUSTOM" },
    { code: "ASIA_DHAKA", label: "Bangladesh", iana: "Asia/Dhaka", mode: "CUSTOM" },
    { code: "ASIA_DUBAI", label: "Dubai (UAE)", iana: "Asia/Dubai", mode: "CUSTOM" },
    { code: "ASIA_KARACHI", label: "Pakistan", iana: "Asia/Karachi", mode: "CUSTOM" },
    { code: "UTC", label: "UTC", iana: "UTC", mode: "CUSTOM" },
    { code: "EUROPE_LONDON", label: "London (UK)", iana: "Europe/London", mode: "CUSTOM" },
    { code: "AMERICA_NEW_YORK", label: "New York (USA)", iana: "America/New_York", mode: "CUSTOM" },
    { code: "ASIA_SINGAPORE", label: "Singapore", iana: "Asia/Singapore", mode: "CUSTOM" },
  ];

  private readonly timeZoneSubject: BehaviorSubject<TimeZoneState>;
  readonly timeZone$;

  constructor(private subjectRegistry: SubjectRegistryService) {
    const initialState = this.getInitialState();

    this.timeZoneSubject = this.subjectRegistry.register(
      this.TIME_ZONE_KEY,
      () => new BehaviorSubject<TimeZoneState>(initialState),
      initialState
    );

    this.timeZone$ = this.timeZoneSubject.asObservable();

    if (!this.timeZoneSubject.value) {
      this.timeZoneSubject.next(initialState);
    }
  }

  getAvailableTimeZones(): TimeZoneOption[] {
    return [this.getSystemOption(), ...this.commonZones];
  }

  getCurrentState(): TimeZoneState {
    return this.timeZoneSubject.value || this.getSystemState();
  }

  getActiveTimeZone(): string {
    return this.getCurrentState().iana;
  }

  getSystemTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }

  getSystemOption(): TimeZoneOption {
    const systemIana = this.getSystemTimeZone();
    return {
      code: "SYSTEM",
      label: `System timezone (${systemIana})`,
      iana: systemIana,
      mode: "SYSTEM",
    };
  }

  useSystemTimeZone(): TimeZoneState {
    const nextState = this.getSystemState();
    this.saveState(nextState);
    this.timeZoneSubject.next(nextState);
    return nextState;
  }

  setTimeZone(optionOrIana: TimeZoneOption | string): TimeZoneState {
    const option =
      typeof optionOrIana === "string"
        ? this.findOption(optionOrIana) || this.createCustomOption(optionOrIana)
        : optionOrIana;

    const nextState = this.toState(option);
    this.saveState(nextState);
    this.timeZoneSubject.next(nextState);
    return nextState;
  }

  isSelected(codeOrIana: string): boolean {
    const current = this.getCurrentState();
    return current.code === codeOrIana || current.iana === codeOrIana;
  }

  getOffsetMinutes(timeZone: string, date: Date = new Date()): number {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const parts = dtf.formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }
    }

    const asUTC = Date.UTC(
      Number(map["year"]),
      Number(map["month"]) - 1,
      Number(map["day"]),
      Number(map["hour"]),
      Number(map["minute"]),
      Number(map["second"])
    );

    return (asUTC - date.getTime()) / 60000;
  }

  getOffsetLabel(timeZone: string, date: Date = new Date()): string {
    const mins = this.getOffsetMinutes(timeZone, date);
    const sign = mins >= 0 ? "+" : "-";
    const abs = Math.abs(mins);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    return `UTC${sign}${hh}:${mm}`;
  }

  formatInTimeZone(
    value: string | Date,
    timeZone: string = this.getActiveTimeZone(),
    options?: Intl.DateTimeFormatOptions
  ): string {
    const date = this.toDate(value);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone,
      dateStyle: options?.dateStyle ?? "medium",
      timeStyle: options?.timeStyle ?? "medium",
      hour12: options?.hour12 ?? false,
    }).format(date);
  }

  getReportRange(
    fromDate: string | Date,
    toDate: string | Date,
    timeZone: string = this.getActiveTimeZone()
  ): ReportRangeResult {
    const fromUtcDate = this.buildZonedDate(fromDate, timeZone, {
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    const toUtcDate = this.buildZonedDate(toDate, timeZone, {
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    });

    return {
      fromUtc: fromUtcDate.toISOString(),
      toUtc: toUtcDate.toISOString(),
      timeZone,
      fromLocal: this.formatInTimeZone(fromUtcDate, timeZone, {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
      toLocal: this.formatInTimeZone(toUtcDate, timeZone, {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    };
  }

  convertDateToSelectedZone(value: string | Date): string {
    return this.formatInTimeZone(value, this.getActiveTimeZone(), {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  }

  private getInitialState(): TimeZoneState {
    const saved = this.readSavedState();

    if (saved) {
      if (saved.mode === "SYSTEM") {
        return this.getSystemState();
      }

      const found = this.findOption(saved.iana || saved.code);
      if (found) {
        return this.toState(found);
      }
    }

    return this.getSystemState();
  }

  private getSystemState(): TimeZoneState {
    return this.toState(this.getSystemOption());
  }

  private toState(option: TimeZoneOption): TimeZoneState {
    const iana = option.mode === "SYSTEM" ? this.getSystemTimeZone() : option.iana;

    return {
      code: option.code,
      mode: option.mode,
      label: option.mode === "SYSTEM" ? `System timezone (${iana})` : option.label,
      iana,
      offsetLabel: this.getOffsetLabel(iana),
    };
  }

  private findOption(codeOrIana: string): TimeZoneOption | undefined {
    const system = this.getSystemOption();
    const all = [system, ...this.commonZones];

    return all.find((z) => z.code === codeOrIana || z.iana === codeOrIana);
  }

  private createCustomOption(iana: string): TimeZoneOption {
    return {
      code: iana,
      label: iana,
      iana,
      mode: "CUSTOM",
    };
  }

  private buildZonedDate(
    input: string | Date,
    timeZone: string,
    timeParts: {
      hour: number;
      minute: number;
      second: number;
      millisecond: number;
    }
  ): Date {
    const parts = this.extractDateParts(input);

    const utcGuess = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      timeParts.hour,
      timeParts.minute,
      timeParts.second,
      timeParts.millisecond
    );

    let offset = this.getOffsetMinutes(timeZone, new Date(utcGuess));
    let corrected = utcGuess - offset * 60_000;

    const offset2 = this.getOffsetMinutes(timeZone, new Date(corrected));
    if (offset2 !== offset) {
      corrected = utcGuess - offset2 * 60_000;
    }

    return new Date(corrected);
  }

  private extractDateParts(input: string | Date): { year: number; month: number; day: number } {
    if (input instanceof Date) {
      return {
        year: input.getFullYear(),
        month: input.getMonth() + 1,
        day: input.getDate(),
      };
    }

    const value = String(input).trim();

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: Number(isoMatch[3]),
      };
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
      };
    }

    throw new Error(`Invalid date input: ${input}`);
  }

  private toDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private readSavedState(): TimeZoneState | null {
    if (typeof window === "undefined") return null;

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as TimeZoneState;
    } catch {
      return null;
    }
  }

  private saveState(state: TimeZoneState): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }
}