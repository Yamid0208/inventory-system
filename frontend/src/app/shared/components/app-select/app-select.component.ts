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
  templateUrl: './app-select.component.html'
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
