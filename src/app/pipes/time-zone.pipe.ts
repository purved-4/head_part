import { Pipe, PipeTransform } from "@angular/core";
import { TimeZoneServiceService } from "../common/time-zone/time-zone-service.service";

@Pipe({
  name: "tz",
  pure: false,
})
export class TimeZonePipe implements PipeTransform {
  constructor(private tzService: TimeZoneServiceService) {}

  transform(value: any, format: "full" | "date" | "time" = "full"): string {
    if (!value) return "-";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";

    // 👉 yaha se selected timezone uth raha hai (NOT system)
    const timeZone = this.tzService.getActiveTimeZone();

    let options: Intl.DateTimeFormatOptions;

    if (format === "date") {
      options = {
        timeZone,
        day: "2-digit",
        month: "short",
        year: "numeric",
      };
    } else if (format === "time") {
      options = {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      };
    } else {
      options = {
        timeZone,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      };
    }

    return new Intl.DateTimeFormat("en-GB", options).format(date);
  }
}