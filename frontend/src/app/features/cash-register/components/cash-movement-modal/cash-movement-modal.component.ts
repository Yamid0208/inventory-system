import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateCashMovementRequest } from '../../../../core/models/cash-register.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { ThousandsSeparatorDirective } from '../../../../shared/directives/thousands-separator.directive';

@Component({
  selector: 'app-cash-movement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, ThousandsSeparatorDirective],
  templateUrl: './cash-movement-modal.component.html'
})
export class CashMovementModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input() loading = false;
  @Input() errorMessage: string | null = null;
  @Input() initialMovementType: 'ManualInflow' | 'ManualOutflow' | 'CashWithdrawal' = 'ManualOutflow';

  @Output() submitMovement = new EventEmitter<CreateCashMovementRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  readonly movementTypes = [
    {
      id: 'ManualInflow' as const,
      label: '+ Ingreso',
      subtitle: 'Inyección caja',
      activeClass: 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    },
    {
      id: 'ManualOutflow' as const,
      label: '- Egreso / Gasto',
      subtitle: 'Compra menor',
      activeClass: 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
    },
    {
      id: 'CashWithdrawal' as const,
      label: '↓ Retiro',
      subtitle: 'A caja fuerte',
      activeClass: 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    }
  ] as const;

  get currentMovementType(): 'ManualInflow' | 'ManualOutflow' | 'CashWithdrawal' {
    return this.form?.get('movementType')?.value || this.initialMovementType;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      movementType: [this.initialMovementType, [Validators.required]],
      paymentMethod: ['Cash', [Validators.required]],
      amount: [null, [Validators.required, Validators.min(1)]],
      concept: ['', [Validators.required, Validators.minLength(3)]],
      notes: ['']
    });
  }

  setMovementType(type: 'ManualInflow' | 'ManualOutflow' | 'CashWithdrawal'): void {
    this.form.patchValue({ movementType: type });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    this.submitMovement.emit({
      movementType: val.movementType,
      paymentMethod: val.paymentMethod,
      amount: Number(val.amount),
      concept: val.concept.trim(),
      notes: val.notes?.trim() || undefined
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

