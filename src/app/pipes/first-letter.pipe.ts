import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'firstLetter',
  pure: true
})
export class FirstLetterPipe implements PipeTransform {
 
  transform(value: string | null | undefined, mode: 'first' | 'initials' = 'first'): string {
    if (value == null) return '';
    const str = String(value).trim();
    if (!str) return '';

    if (mode === 'initials') {
      return str
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0].toUpperCase())
        .join('');
    }

    return str[0].toUpperCase();
  }
}
