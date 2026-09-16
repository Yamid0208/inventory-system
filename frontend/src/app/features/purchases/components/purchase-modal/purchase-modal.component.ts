import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supplier } from '../../../../core/models/supplier.model';
import { Product } from '../../../../core/models/product.model';
import { CreatePurchaseRequest } from '../../../../core/models/purchase.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppAutocompleteComponent, AutocompleteOption } from '../../../../shared/components/app-autocomplete/app-autocomplete.component';
import { ThousandsSeparatorDirective } from '../../../../shared/directives/thousands-separator.directive';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { SettingsService } from '../../../../core/services/settings.service';
import { formatThousands } from '../../../../shared/utils/number-format.util';

@Component({
  selector: 'app-purchase-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppButtonComponent,
    AppAutocompleteComponent,
    ThousandsSeparatorDirective,
    CurrencyFormatPipe
  ],
  templateUrl: './purchase-modal.component.html'
})
export class PurchaseModalComponent implements OnInit, OnChanges {
  private _suppliersSignal = signal<Supplier[]>([]);
  @Input() set suppliers(val: Supplier[]) {
    this._suppliersSignal.set(val || []);
  }
  get suppliers(): Supplier[] {
    return this._suppliersSignal();
  }

  private _productsSignal = signal<Product[]>([]);
  @Input() set products(val: Product[]) {
    this._productsSignal.set(val || []);
    this.syncPreloadedItem();
  }
  get products(): Product[] {
    return this._productsSignal();
  }

  private _preloadedItemSignal = signal<{ productId?: number; quantity?: number; supplierId?: number } | null>(null);
  @Input() set preloadedItem(val: { productId?: number; quantity?: number; supplierId?: number } | null) {
    this._preloadedItemSignal.set(val);
    this.syncPreloadedItem();
  }
  get preloadedItem(): { productId?: number; quantity?: number; supplierId?: number } | null {
    return this._preloadedItemSignal();
  }

  @Input() loading: any = false;
  @Input() errorMessage: any = null;

  @Output() save = new EventEmitter<CreatePurchaseRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  selectedSupplierId = signal<number | null>(null);
  taxRatePercent = signal<number>(19);
  taxRateDecimal = signal<number>(0.19);

  // Opciones de proveedores para el autocomplete
  supplierOptions = computed<AutocompleteOption[]>(() => {
    return this._suppliersSignal().map(s => ({
      value: s.id,
      label: s.name,
      sublabel: `NIT: ${s.taxId} | ${s.contactName || 'Sin contacto'}`
    }));
  });

  // Productos filtrados estrictamente por el proveedor seleccionado
  filteredProducts = computed<Product[]>(() => {
    const supId = this.selectedSupplierId();
    if (!supId) return [];
    return this._productsSignal().filter(p => Number(p.supplierId) === Number(supId) && p.isActive);
  });

  // Opciones de productos para el autocomplete de líneas
  productOptions = computed<AutocompleteOption[]>(() => {
    return this.filteredProducts().map(p => ({
      value: p.id,
      label: `[${p.sku}] ${p.name}`,
      sublabel: `Costo Ref: $${formatThousands(p.purchasePrice)} | Stock actual: ${p.currentStock}`
    }));
  });

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    const preloaded = this._preloadedItemSignal();
    const initialSupplier = preloaded?.supplierId ? Number(preloaded.supplierId) : null;
    this.selectedSupplierId.set(initialSupplier);

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

    if (preloaded?.productId) {
      this.syncPreloadedItem();
    } else if (initialSupplier) {
      this.addItem();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['preloadedItem'] && this.preloadedItem && this.form) {
      this.syncPreloadedItem();
    }
  }

  private syncPreloadedItem(): void {
    if (!this.form) return;
    const preloaded = this._preloadedItemSignal();
    const prods = this._productsSignal();

    if (!preloaded) return;

    if (preloaded.supplierId) {
      const supId = Number(preloaded.supplierId);
      if (this.selectedSupplierId() !== supId) {
        this.selectedSupplierId.set(supId);
        this.form.patchValue({ supplierId: supId });
      }
    }

    if (preloaded.productId) {
      const prodId = Number(preloaded.productId);
      const prod = prods.find(p => p.id === prodId);

      if (prod && !this.selectedSupplierId()) {
        this.selectedSupplierId.set(prod.supplierId);
        this.form.patchValue({ supplierId: prod.supplierId });
      }

      const existingItem = this.itemsArray.controls.find(
        c => Number(c.get('productId')?.value) === prodId
      );

      if (existingItem) {
        if (prod && (!existingItem.get('unitPrice')?.value || existingItem.get('unitPrice')?.value === 0)) {
          existingItem.patchValue({ unitPrice: prod.purchasePrice });
        }
      } else if (this.itemsArray.length === 0) {
        const qty = Number(preloaded.quantity) || 1;
        const price = prod ? prod.purchasePrice : 0;
        const itemGroup = this.fb.group({
          productId: [prodId, [Validators.required]],
          quantity: [qty, [Validators.required, Validators.min(1)]],
          unitPrice: [price, [Validators.required, Validators.min(0)]],
          taxRate: [this.taxRateDecimal()]
        });
        this.itemsArray.push(itemGroup);
      }
    }
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  onSupplierChange(supplierId: any): void {
    const newId = supplierId ? Number(supplierId) : null;
    const prevId = this.selectedSupplierId();

    if (newId !== prevId) {
      this.selectedSupplierId.set(newId);
      this.form.patchValue({ supplierId: newId });

      // Limpiar líneas anteriores para evitar que queden productos del proveedor anterior
      this.itemsArray.clear();

      if (newId) {
        // Si el nuevo proveedor tiene productos, agregar una línea inicial vacía
        const prods = this.products.filter(p => Number(p.supplierId) === newId && p.isActive);
        if (prods.length > 0) {
          this.addItem();
        }
      }
    }
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      productId: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [this.taxRateDecimal()]
    });
    this.itemsArray.insert(0, itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  onProductSelect(index: number, productId: any): void {
    const prodId = Number(productId);
    const group = this.itemsArray.at(index);
    group.patchValue({ productId: prodId });

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
    if (this.form.invalid || this.itemsArray.length === 0) return;

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
