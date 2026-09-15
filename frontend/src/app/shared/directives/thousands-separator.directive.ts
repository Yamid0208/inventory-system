import { Directive, ElementRef, HostListener, Input, OnInit, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatThousands, parseThousands } from '../utils/number-format.util';

@Directive({
  selector: 'input[appThousandsSeparator]',
  standalone: true
})
export class ThousandsSeparatorDirective implements OnInit {
  @Input() allowDecimals = true;
  @Input() maxDecimals = 2;

  get effectiveDecimals(): number {
    return this.allowDecimals ? this.maxDecimals : 0;
  }

  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() @Self() private ngControl: NgControl
  ) {}

  ngOnInit(): void {
    // Formatear valor inicial si ya existe
    setTimeout(() => {
      this.formatDisplay();
    });
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = this.el.nativeElement;
    const rawVal = input.value;

    if (!rawVal) {
      this.updateControlValue(0);
      return;
    }

    // Permitir escribir decimales temporalmente (ej: '100,' o '100.')
    const endsWithDecimal = this.allowDecimals && (rawVal.endsWith(',') || rawVal.endsWith('.'));
    const numericValue = parseThousands(rawVal);
    let formatted = formatThousands(numericValue, { maxDecimals: this.effectiveDecimals });

    if (endsWithDecimal && !formatted.includes(',')) {
      formatted += ',';
    }

    // Ajustar posición del cursor tras formatear
    const cursorPos = input.selectionStart || formatted.length;
    const prevLen = rawVal.length;

    input.value = formatted;

    const newLen = formatted.length;
    const newPos = Math.max(0, cursorPos + (newLen - prevLen));
    input.setSelectionRange(newPos, newPos);

    this.updateControlValue(numericValue);
  }

  @HostListener('blur')
  onBlur(): void {
    this.formatDisplay();
  }

  private formatDisplay(): void {
    const input = this.el.nativeElement;
    let currentVal = this.ngControl?.value !== undefined ? this.ngControl.value : input.value;
    if (currentVal !== null && currentVal !== undefined && currentVal !== '') {
      input.value = formatThousands(currentVal, { maxDecimals: this.effectiveDecimals });
    }
  }

  private updateControlValue(numericVal: number): void {
    if (this.ngControl && this.ngControl.control) {
      // Emitir solo el valor numérico al FormControl sin provocar loops
      this.ngControl.control.setValue(numericVal, {
        emitModelToViewChange: false,
        emitViewToModelChange: false
      });
      this.ngControl.control.markAsDirty();
      this.ngControl.control.updateValueAndValidity({ emitEvent: false });
    }
  }
}
