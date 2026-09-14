import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product, CreateProductRequest, UpdateProductRequest } from '../../../../core/models/product.model';
import { Category } from '../../../../core/models/category.model';
import { Supplier } from '../../../../core/models/supplier.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 max-h-[92vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">
                {{ product ? 'Editar Producto' : 'Nuevo Producto' }}
              </h3>
              <p class="text-xs text-slate-400">
                {{ product ? 'Modifica los atributos comerciales y técnicos del producto' : 'Registra un nuevo producto en el catálogo' }}
              </p>
            </div>
          </div>

          <button
            type="button"
            (click)="cancel.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Formulario Reactivo -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- SKU -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Código SKU <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                formControlName="sku"
                placeholder="Ej: ELE-MO-024"
                [readOnly]="!!product"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                [class.border-rose-400]="form.get('sku')?.invalid && form.get('sku')?.touched"
              />
              @if (form.get('sku')?.invalid && form.get('sku')?.touched) {
                <p class="text-[11px] text-rose-500 mt-1">El SKU es obligatorio (alfanumérico y guiones).</p>
              }
            </div>

            <!-- Nombre -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Nombre del Producto <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Ej: Monitor 27'' 4K Ultra"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                [class.border-rose-400]="form.get('name')?.invalid && form.get('name')?.touched"
              />
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <p class="text-[11px] text-rose-500 mt-1">El nombre es obligatorio (máx. 200).</p>
              }
            </div>

            <!-- Categoría -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Categoría <span class="text-rose-500">*</span>
              </label>
              <select
                formControlName="categoryId"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option [ngValue]="null" disabled>Selecciona una categoría...</option>
                @for (cat of categories; track cat.id) {
                  <option [ngValue]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>

            <!-- Proveedor -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Proveedor Principal <span class="text-rose-500">*</span>
              </label>
              <select
                formControlName="supplierId"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option [ngValue]="null" disabled>Selecciona un proveedor...</option>
                @for (sup of suppliers; track sup.id) {
                  <option [ngValue]="sup.id">{{ sup.name }} ({{ sup.taxId }})</option>
                }
              </select>
            </div>

            <!-- Precio Compra -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Precio de Compra ($) <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                formControlName="purchasePrice"
                placeholder="0.00"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>

            <!-- Precio Venta -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Precio de Venta ($) <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                formControlName="salePrice"
                placeholder="0.00"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>

            <!-- Stock Mínimo -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Stock Mínimo (Umbral de Alerta) <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                formControlName="minimumStock"
                placeholder="5"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>

            <!-- Margen Comercial Estimado (RN-003) -->
            <div class="flex flex-col justify-end">
              <div
                class="p-2.5 rounded-xl border flex items-center justify-between text-xs"
                [class]="calculatedMargin >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'"
              >
                <span class="font-medium">Margen Bruto Estimado:</span>
                <span class="font-bold font-mono text-sm">
                  {{ calculatedMargin >= 0 ? '+' : '' }}{{ calculatedMargin | number:'1.1-1' }}%
                </span>
              </div>
            </div>

            <!-- Descripción -->
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Descripción Detallada
              </label>
              <textarea
                formControlName="description"
                rows="2"
                placeholder="Especificaciones técnicas, dimensiones, empaque o características clave..."
                class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Error Alert si ocurre -->
          @if (errorMessage()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Footer Buttons -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <app-button variant="outline" type="button" (clicked)="cancel.emit()">
              Cancelar
            </app-button>
            <app-button variant="primary" type="submit" [loading]="loading()">
              {{ product ? 'Guardar Cambios' : 'Crear Producto' }}
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `
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
