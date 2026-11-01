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
