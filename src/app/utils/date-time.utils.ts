export class DateTimeUtil {

  static toUtcISOString(date: Date | string): string {
    const localDate = new Date(date);
    return new Date(
      localDate.getTime() - localDate.getTimezoneOffset() * 60000
    ).toISOString();
  }

  static utcToISOString(date: Date | string): string {
  return new Date(date).toISOString();
}

}