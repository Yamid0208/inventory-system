import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supplier } from '../../../../core/models/supplier.model';
import { Product } from '../../../../core/models/product.model';
import { CreatePurchaseRequest } from '../../../../core/models/purchase.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { SettingsService } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-purchase-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, CurrencyFormatPipe],
  templateUrl: './purchase-modal.component.html'
})
export class PurchaseModalComponent implements OnInit, OnChanges {
  @Input() suppliers: Supplier[] = [];
  @Input() products: Product[] = [];
  @Input() preloadedItem: { productId?: number; quantity?: number; supplierId?: number } | null = null;
  @Input() loading: any = false;
  @Input() errorMessage: any = null;

  @Output() save = new EventEmitter<CreatePurchaseRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  taxRatePercent = signal<number>(19);
  taxRateDecimal = signal<number>(0.19);

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    const initialSupplier = this.preloadedItem?.supplierId ?? null;

    this.form = this.fb.group({
      supplierId: [initialSupplier, [Validators.required]],
      purchaseDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
      notes: [''],
      autoReceive: [true],
      items: this.fb.array([])
    });

    this.settingsService.getSettings().subscribe({
      next: (s) => {
        const rate = s.defaultTaxRate ?? 19;
        this.taxRatePercent.set(rate);
        this.taxRateDecimal.set(rate > 1 ? rate / 100 : rate);

        this.itemsArray.controls.forEach(control => {
          control.patchValue({ taxRate: this.taxRateDecimal() });
        });
      },
      error: () => {}
    });

    if (this.preloadedItem?.productId) {
      const prodId = Number(this.preloadedItem.productId);
      const qty = Number(this.preloadedItem.quantity) || 1;
      const prod = this.products.find(p => p.id === prodId);
      const price = prod ? prod.purchasePrice : 0;

      const itemGroup = this.fb.group({
        productId: [prodId, [Validators.required]],
        quantity: [qty, [Validators.required, Validators.min(1)]],
        unitPrice: [price, [Validators.required, Validators.min(0)]],
        taxRate: [this.taxRateDecimal()]
      });
      this.itemsArray.push(itemGroup);
    } else {
      this.addItem();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products'] && this.products.length > 0 && this.itemsArray?.length > 0) {
      this.itemsArray.controls.forEach(control => {
        const prodId = Number(control.get('productId')?.value);
        if (prodId && (!control.get('unitPrice')?.value || control.get('unitPrice')?.value === 0)) {
          const prod = this.products.find(p => p.id === prodId);
          if (prod) {
            control.patchValue({ unitPrice: prod.purchasePrice });
          }
        }
      });
    }

    if (changes['preloadedItem'] && this.preloadedItem && this.form) {
      if (this.preloadedItem.supplierId) {
        this.form.patchValue({ supplierId: this.preloadedItem.supplierId });
      }
      if (this.preloadedItem.productId && this.itemsArray.length > 0) {
        const firstLine = this.itemsArray.at(0);
        const prodId = Number(this.preloadedItem.productId);
        const qty = Number(this.preloadedItem.quantity) || 1;
        const prod = this.products.find(p => p.id === prodId);
        firstLine.patchValue({
          productId: prodId,
          quantity: qty,
          unitPrice: prod ? prod.purchasePrice : 0
        });
      }
    }
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      productId: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [this.taxRateDecimal()]
    });
    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  onProductSelect(index: number): void {
    const group = this.itemsArray.at(index);
    const prodId = Number(group.get('productId')?.value);
    const prod = this.products.find(p => p.id === prodId);
    if (prod) {
      group.patchValue({ unitPrice: prod.purchasePrice });
    }
  }

  getLineTotal(index: number): number {
    const group = this.itemsArray.at(index);
    const qty = Number(group.get('quantity')?.value) || 0;
    const price = Number(group.get('unitPrice')?.value) || 0;
    const subtotal = qty * price;
    return subtotal * (1 + this.taxRateDecimal());
  }

  calculatedSubtotal(): number {
    return this.itemsArray.controls.reduce((acc, curr) => {
      const qty = Number(curr.get('quantity')?.value) || 0;
      const price = Number(curr.get('unitPrice')?.value) || 0;
      return acc + (qty * price);
    }, 0);
  }

  calculatedTax(): number {
    return this.calculatedSubtotal() * this.taxRateDecimal();
  }

  calculatedTotal(): number {
    return this.calculatedSubtotal() + this.calculatedTax();
  }

  isLoading(): boolean {
    return typeof this.loading === 'function' ? this.loading() : !!this.loading;
  }

  getErrorMessage(): string | null {
    return typeof this.errorMessage === 'function' ? this.errorMessage() : this.errorMessage;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const val = this.form.value;
    const request: CreatePurchaseRequest = {
      supplierId: Number(val.supplierId),
      purchaseDate: new Date(val.purchaseDate).toISOString(),
      notes: val.notes?.trim() || undefined,
      autoReceive: !!val.autoReceive,
      items: val.items.map((i: any) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        taxRate: this.taxRateDecimal()
      }))
    };

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
