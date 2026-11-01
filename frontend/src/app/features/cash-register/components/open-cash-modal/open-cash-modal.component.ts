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
  private fb = inject(FormBuilder);

  @Input() loading = false;
  @Input() errorMessage: string | null = null;
  @Input() warehouses: Warehouse[] = [];
  @Input() defaultWarehouseId: number | null = null;

  @Output() submitOpen = new EventEmitter<OpenCashRegisterRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      initialCash: [0, [Validators.required, Validators.min(0)]],
      warehouseId: [this.defaultWarehouseId],
      notes: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    this.submitOpen.emit({
      initialCash: Number(val.initialCash) || 0,
      warehouseId: val.warehouseId ? Number(val.warehouseId) : undefined,
      notes: val.notes?.trim() || undefined
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

