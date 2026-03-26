import { Pipe, PipeTransform } from '@angular/core';
import { placeholderMap } from '../utils/constants';

@Pipe({
  name: 'placeholder',
})
export class PlaceholderPipe implements PipeTransform {

  transform(field: string, custom?: string): string {
  if (custom) return custom;

  return placeholderMap[field] || 'Enter value';
}

}
