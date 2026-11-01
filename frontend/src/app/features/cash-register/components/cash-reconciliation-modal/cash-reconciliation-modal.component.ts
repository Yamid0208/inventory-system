import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CashRegisterAuditSummary, CloseCashRegisterRequest } from '../../../../core/models/cash-register.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppBadgeComponent } from '../../../../shared/components/app-badge/app-badge.component';
import { ThousandsSeparatorDirective } from '../../../../shared/directives/thousands-separator.directive';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-cash-reconciliation-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppButtonComponent,
    AppBadgeComponent,
    ThousandsSeparatorDirective,
    CurrencyFormatPipe
  ],
  templateUrl: './cash-reconciliation-modal.component.html'
})
export class CashReconciliationModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input() summary!: CashRegisterAuditSummary;
  @Input() loading = false;
  @Input() errorMessage: string | null = null;

  @Output() confirmClose = new EventEmitter<CloseCashRegisterRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  difference = signal<number>(0);
  differenceStatus = signal<'Balanced' | 'Surplus' | 'Shortage'>('Balanced');

  ngOnInit(): void {
    const expected = this.summary?.expectedCash ?? 0;
    this.form = this.fb.group({
      actualCash: [expected, [Validators.required, Validators.min(0)]],
      notes: ['']
    });

    this.calculateDifference(expected);

    this.form.get('actualCash')?.valueChanges.subscribe(val => {
      const num = Number(val) || 0;
      this.calculateDifference(num);
    });
  }

  private calculateDifference(actual: number): void {
    const expected = this.summary?.expectedCash ?? 0;
    const diff = Math.round((actual - expected) * 100) / 100;
    this.difference.set(diff);

    if (diff === 0) {
      this.differenceStatus.set('Balanced');
      this.form.get('notes')?.clearValidators();
    } else if (diff > 0) {
      this.differenceStatus.set('Surplus');
      this.form.get('notes')?.setValidators([Validators.required, Validators.minLength(5)]);
    } else {
      this.differenceStatus.set('Shortage');
      this.form.get('notes')?.setValidators([Validators.required, Validators.minLength(5)]);
    }
    this.form.get('notes')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    this.confirmClose.emit({
      actualCash: Number(val.actualCash) || 0,
      notes: val.notes?.trim() || undefined
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
