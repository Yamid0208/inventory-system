import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OpenCashRegisterRequest } from '../../../../core/models/cash-register.model';
import { Warehouse } from '../../../../core/models/warehouse.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { ThousandsSeparatorDirective } from '../../../../shared/directives/thousands-separator.directive';

@Component({
  selector: 'app-open-cash-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, ThousandsSeparatorDirective],
  templateUrl: './open-cash-modal.component.html'
})
export class OpenCashModalComponent implements OnInit {
  constructor(private fb: FormBuilder) {}

  @Input() loading = false;
  @Input() errorMessage: string | null = null;
  @Input() warehouses: Warehouse[] = [];
  @Input() defaultWarehouseId: number | null = null;

  @Output() submitOpen = new EventEmitter<OpenCashRegisterRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  ngOnInit(): void {
    const initialWhId = this.defaultWarehouseId || (this.warehouses.length > 0 ? this.warehouses[0].id : null);
    this.form = this.fb.group({
      initialCash: [0, [Validators.required, Validators.min(0)]],
      warehouseId: [initialWhId, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const whId = Number(val.warehouseId);
    if (!whId || whId <= 0) {
      this.form.get('warehouseId')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    this.submitOpen.emit({
      initialCash: Number(val.initialCash) || 0,
      warehouseId: whId,
      notes: val.notes?.trim() || undefined
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

