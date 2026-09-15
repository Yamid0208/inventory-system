import { Component, EventEmitter, Input, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product } from '../../../../core/models/product.model';
import { CreateStockAdjustmentRequest } from '../../../../core/models/inventory.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-stock-adjustment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  templateUrl: './stock-adjustment-modal.component.html'
})
export class StockAdjustmentModalComponent implements OnInit {
  @Input() products: Product[] = [];
  @Input() loading: any = false;
  @Input() errorMessage: any = null;

  @Output() save = new EventEmitter<CreateStockAdjustmentRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      productId: [null, [Validators.required]],
      adjustmentType: ['AdjustmentIn', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason: ['', [Validators.required]],
      notes: ['']
    });
  }

  setAdjustmentType(type: 'AdjustmentIn' | 'AdjustmentOut'): void {
    this.form.patchValue({ adjustmentType: type });
  }

  selectedProduct(): Product | undefined {
    const pId = this.form?.get('productId')?.value;
    if (!pId) return undefined;
    return this.products.find(p => p.id === Number(pId));
  }

  projectedStock(): number {
    const prod = this.selectedProduct();
    if (!prod) return 0;
    const qty = Number(this.form.get('quantity')?.value) || 0;
    const isEntry = this.form.get('adjustmentType')?.value === 'AdjustmentIn';
    return isEntry ? prod.currentStock + qty : prod.currentStock - qty;
  }

  isNegativeStock(): boolean {
    const prod = this.selectedProduct();
    if (!prod) return false;
    const isEntry = this.form.get('adjustmentType')?.value === 'AdjustmentIn';
    if (isEntry) return false;
    const qty = Number(this.form.get('quantity')?.value) || 0;
    return prod.currentStock - qty < 0;
  }

  isLoading(): boolean {
    return typeof this.loading === 'function' ? this.loading() : !!this.loading;
  }

  getErrorMessage(): string | null {
    return typeof this.errorMessage === 'function' ? this.errorMessage() : this.errorMessage;
  }

  onSubmit(): void {
    if (this.form.invalid || this.isNegativeStock()) return;

    const val = this.form.value;
    const request: CreateStockAdjustmentRequest = {
      productId: Number(val.productId),
      adjustmentType: val.adjustmentType,
      quantity: Number(val.quantity),
      reason: val.reason,
      notes: val.notes?.trim() || undefined
    };

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
