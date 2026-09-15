import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppDatePickerComponent),
      multi: true
    }
  ],
  templateUrl: './app-date-picker.component.html'
})
export class AppDatePickerComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() name = '';
  @Input() min?: string;
  @Input() max?: string;
  @Input() disabled = false;
  @Input() hasError = false;

  value = '';

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    if (value instanceof Date) {
      this.value = value.toISOString().split('T')[0];
    } else if (typeof value === 'string') {
      this.value = value.split('T')[0];
    } else {
      this.value = '';
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

  onDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(target.value);
  }

  onBlur(): void {
    this.onTouched();
  }
}
