import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

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
  template: `
    <div class="relative w-full flex items-center">
      @if (prefixText) {
        <span class="absolute left-3.5 text-xs text-slate-400 font-medium pointer-events-none select-none">
          {{ prefixText }}
        </span>
      }

      <input
        [id]="id"
        [name]="name"
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [value]="value"
        (input)="onInputChange($event)"
        (blur)="onBlur()"
        [ngClass]="[
          'w-full py-2.5 text-xs text-slate-900 transition-all rounded-2xl focus:outline-none font-medium',
          prefixText ? 'pl-8.5' : 'px-4',
          suffixText ? 'pr-8.5' : 'px-4',
          hasError
            ? 'bg-rose-50/60 border border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
            : 'bg-slate-50/90 border border-slate-200/80 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15',
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-text'
        ]"
        [attr.aria-invalid]="hasError"
      />

      @if (suffixText) {
        <span class="absolute right-3.5 text-xs text-slate-400 font-medium pointer-events-none select-none">
          {{ suffixText }}
        </span>
      }
    </div>
  `
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

  value: any = '';

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.value = value !== undefined && value !== null ? value : '';
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
    const val = this.type === 'number' ? (target.value === '' ? null : Number(target.value)) : target.value;
    this.value = val;
    this.onChange(val);
  }

  onBlur(): void {
    this.onTouched();
  }
}
