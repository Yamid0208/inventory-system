import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="relative w-full">
      <select
        [id]="id"
        [name]="name"
        [disabled]="disabled"
        [value]="value"
        (change)="onSelectChange($event)"
        (blur)="onBlur()"
        [ngClass]="[
          'w-full py-2.5 px-3.5 text-xs text-slate-800 transition-all rounded-xl focus:outline-none appearance-none cursor-pointer',
          hasError
            ? 'bg-rose-50/50 border border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
            : 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        ]"
        [attr.aria-invalid]="hasError"
      >
        @if (placeholder) {
          <option [value]="null" disabled selected>{{ placeholder }}</option>
        }
        @for (opt of options; track opt.value) {
          <option [value]="opt.value">{{ opt.label }}</option>
        }
      </select>

      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>
  `
})
export class AppSelectComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() name = '';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Seleccione una opción';
  @Input() disabled = false;
  @Input() hasError = false;

  value: any = null;

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.value = value;
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

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedVal = target.value;
    // Tentar match con el valor original
    const matched = this.options.find(o => String(o.value) === selectedVal);
    const parsed = matched ? matched.value : selectedVal;
    this.value = parsed;
    this.onChange(parsed);
  }

  onBlur(): void {
    this.onTouched();
  }
}
