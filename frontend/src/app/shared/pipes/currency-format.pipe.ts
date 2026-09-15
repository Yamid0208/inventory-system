import { Pipe, PipeTransform } from '@angular/core';
import { formatThousands } from '../utils/number-format.util';

@Pipe({
  name: 'currencyFormat',
  standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined, _currencyCode: string = 'USD'): string {
    if (value === null || value === undefined || value === '') {
      return '$0';
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numericValue)) {
      return '$0';
    }

    return `$${formatThousands(numericValue)}`;
  }
}

