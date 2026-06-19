import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "crformat",
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) return "0";

    const num = Number(value);

    if (isNaN(num)) return "0";

    // 1 Crore = 1,00,00,000
    if (num >= 10000000) {
      const crValue = num / 10000000;

      // remove unnecessary decimals
      return `${parseFloat(crValue.toFixed(2))} Cr`;
    }

    return num.toLocaleString("en-IN");
  }
}
