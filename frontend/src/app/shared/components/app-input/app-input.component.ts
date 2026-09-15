import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { formatThousands, parseThousands } from '../../utils/number-format.util';


@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppInputComponent),
      multi: true
    }
  ],
  templateUrl: './app-input.component.html'
})
export class AppInputComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() name = '';
  @Input() type: string = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() hasError = false;
  @Input() prefixText?: string;
  @Input() suffixText?: string;
  @Input() useThousandsSeparator = false;

  value: any = '';
  displayValue = '';

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.value = value !== undefined && value !== null ? value : '';
    if (this.useThousandsSeparator && this.value !== '') {
      this.displayValue = formatThousands(this.value);
    } else {
      this.displayValue = String(this.value);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (this.useThousandsSeparator) {
      const raw = target.value;
      const parsed = parseThousands(raw);
      this.value = parsed;
      this.displayValue = formatThousands(parsed);
      target.value = this.displayValue;
      this.onChange(parsed);
      return;
    }

    const val = this.type === 'number' ? (target.value === '' ? null : Number(target.value)) : target.value;
    this.value = val;
    this.onChange(val);
  }

  onBlur(): void {
    if (this.useThousandsSeparator && this.value !== null && this.value !== undefined) {
      this.displayValue = formatThousands(this.value);
    }
    this.onTouched();
  }
}
