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
  template: `
    <div class="relative w-full flex items-center">
      <input
        type="date"
        [id]="id"
        [name]="name"
        [min]="min"
        [max]="max"
        [disabled]="disabled"
        [value]="value"
        (input)="onDateChange($event)"
        (blur)="onBlur()"
        [ngClass]="[
          'w-full py-2.5 px-3.5 text-xs text-slate-800 transition-all rounded-xl focus:outline-none cursor-pointer',
          hasError
            ? 'bg-rose-50/50 border border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
            : 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        ]"
        [attr.aria-invalid]="hasError"
      />
    </div>
  `
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
