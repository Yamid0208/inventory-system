import { Pipe, PipeTransform } from '@angular/core';
import { formatThousands } from '../utils/number-format.util';

@Pipe({
  name: 'thousandsSeparator',
  standalone: true
})
export class ThousandsSeparatorPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    options?: { preserveDecimals?: boolean; maxDecimals?: number }
  ): string {
    return formatThousands(value, options);
  }
}
