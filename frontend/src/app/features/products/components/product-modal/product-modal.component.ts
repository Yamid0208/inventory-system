import { Component, EventEmitter, Input, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product, CreateProductRequest, UpdateProductRequest } from '../../../../core/models/product.model';
import { Category } from '../../../../core/models/category.model';
import { Supplier } from '../../../../core/models/supplier.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppAutocompleteComponent, AutocompleteOption } from '../../../../shared/components/app-autocomplete/app-autocomplete.component';
import { ThousandsSeparatorDirective } from '../../../../shared/directives/thousands-separator.directive';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppButtonComponent,
    AppAutocompleteComponent,
    ThousandsSeparatorDirective
  ],
  templateUrl: './product-modal.component.html'
})
export class ProductModalComponent implements OnInit {
  @Input() product: Product | null = null;
  @Input() categories: Category[] = [];
  @Input() suppliers: Supplier[] = [];
  @Input() loading = signal<boolean>(false);
  @Input() errorMessage = signal<string | null>(null);

  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      sku: [
        this.product?.sku || '',
        [Validators.required, Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9\-_]+$/)]
      ],
      name: [this.product?.name || '', [Validators.required, Validators.maxLength(200)]],
      description: [this.product?.description || '', [Validators.maxLength(1000)]],
      categoryId: [this.product?.categoryId || (this.categories[0]?.id ?? null), [Validators.required]],
      supplierId: [this.product?.supplierId || (this.suppliers[0]?.id ?? null), [Validators.required]],
      purchasePrice: [this.product?.purchasePrice ?? 0, [Validators.required, Validators.min(0)]],
      salePrice: [this.product?.salePrice ?? 0, [Validators.required, Validators.min(0)]],
      minimumStock: [this.product?.minimumStock ?? 5, [Validators.required, Validators.min(0)]]
    });
  }

  get categoryOptions(): AutocompleteOption[] {
    return this.categories.map(cat => ({
      value: cat.id,
      label: cat.name,
      sublabel: cat.description || undefined
    }));
  }

  get supplierOptions(): AutocompleteOption[] {
    return this.suppliers.map(sup => ({
      value: sup.id,
      label: `${sup.name} (${sup.taxId})`,
      sublabel: sup.contactName || undefined
    }));
  }

  get calculatedMargin(): number {
    const purchase = Number(this.form?.get('purchasePrice')?.value) || 0;
    const sale = Number(this.form?.get('salePrice')?.value) || 0;
    if (sale <= 0) return 0;
    return ((sale - purchase) / sale) * 100;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;

    if (this.product) {
      const updateReq: UpdateProductRequest = {
        name: val.name,
        description: val.description,
        categoryId: Number(val.categoryId),
        supplierId: Number(val.supplierId),
        purchasePrice: Number(val.purchasePrice),
        salePrice: Number(val.salePrice),
        minimumStock: Number(val.minimumStock),
        rowVersion: this.product.rowVersion
      };
      this.save.emit(updateReq);
    } else {
      const createReq: CreateProductRequest = {
        sku: val.sku.trim().toUpperCase(),
        name: val.name,
        description: val.description,
        categoryId: Number(val.categoryId),
        supplierId: Number(val.supplierId),
        purchasePrice: Number(val.purchasePrice),
        salePrice: Number(val.salePrice),
        minimumStock: Number(val.minimumStock)
      };
      this.save.emit(createReq);
    }
  }
}
