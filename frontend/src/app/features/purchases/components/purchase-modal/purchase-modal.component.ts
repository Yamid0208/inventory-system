import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supplier } from '../../../../core/models/supplier.model';
import { Product } from '../../../../core/models/product.model';
import { CreatePurchaseRequest, CreatePurchaseItemRequest } from '../../../../core/models/purchase.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-purchase-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, CurrencyFormatPipe],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 my-8">
        <!-- Encabezado -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900">Nueva Orden de Compra</h2>
              <p class="text-xs text-slate-500">Registra compras a proveedores con incremento atómico de stock.</p>
            </div>
          </div>
          <button
            type="button"
            (click)="onCancel()"
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Alerta de Error -->
        @if (getErrorMessage()) {
          <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <svg class="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="font-medium">{{ getErrorMessage() }}</span>
          </div>
        }

        <!-- Formulario -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Proveedor -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Proveedor *</label>
              <select
                formControlName="supplierId"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
              >
                <option [value]="null">Seleccionar proveedor...</option>
                @for (sup of suppliers; track sup.id) {
                  <option [value]="sup.id">{{ sup.name }} ({{ sup.taxId }})</option>
                }
              </select>
            </div>

            <!-- Fecha de Compra -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Fecha de la Orden *</label>
              <input
                type="date"
                formControlName="purchaseDate"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
          </div>

          <!-- Líneas de Detalle -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-slate-800">Productos a Abastecer (Líneas de Compra)</h3>
              <button
                type="button"
                (click)="addItem()"
                class="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold text-xs transition-colors flex items-center gap-1"
              >
                <span>+ Agregar Línea</span>
              </button>
            </div>

            <div formArrayName="items" class="space-y-2 max-h-60 overflow-y-auto pr-1">
              @for (item of itemsArray.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
                  <!-- Producto -->
                  <div class="flex-1 w-full sm:w-auto">
                    <label class="block text-[10px] text-slate-400 font-medium mb-0.5">Producto</label>
                    <select
                      formControlName="productId"
                      (change)="onProductSelect(i)"
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-primary-500"
                    >
                      <option [value]="null">Seleccionar producto...</option>
                      @for (p of products; track p.id) {
                        <option [value]="p.id">[{{ p.sku }}] {{ p.name }}</option>
                      }
                    </select>
                  </div>

                  <!-- Cantidad -->
                  <div class="w-full sm:w-24">
                    <label class="block text-[10px] text-slate-400 font-medium mb-0.5">Cantidad</label>
                    <input
                      type="number"
                      formControlName="quantity"
                      min="1"
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono text-center focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <!-- Precio Unitario -->
                  <div class="w-full sm:w-28">
                    <label class="block text-[10px] text-slate-400 font-medium mb-0.5">Precio Unit.</label>
                    <input
                      type="number"
                      step="0.01"
                      formControlName="unitPrice"
                      min="0"
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <!-- Subtotal de Línea -->
                  <div class="w-full sm:w-28 text-right">
                    <label class="block text-[10px] text-slate-400 font-medium mb-0.5">Total Línea</label>
                    <div class="py-1.5 font-mono font-bold text-slate-800">
                      {{ getLineTotal(i) | currencyFormat }}
                    </div>
                  </div>

                  <!-- Eliminar Línea -->
                  <button
                    type="button"
                    (click)="removeItem(i)"
                    [disabled]="itemsArray.length === 1"
                    class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30"
                    title="Eliminar fila"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Resumen de Totales y Auto-Receive -->
          <div class="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoReceiveCheck"
                formControlName="autoReceive"
                class="w-4 h-4 text-primary-600 rounded border-slate-700 bg-slate-800 focus:ring-primary-500 cursor-pointer"
              />
              <label for="autoReceiveCheck" class="text-xs text-slate-300 cursor-pointer">
                <strong>Ingreso Inmediato:</strong> Incrementar existencias en almacén y Kardex ahora mismo.
              </label>
            </div>

            <div class="flex items-center gap-6 text-right font-mono text-xs">
              <div>
                <span class="block text-[10px] text-slate-400">Subtotal</span>
                <span>{{ calculatedSubtotal() | currencyFormat }}</span>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400">IVA (19%)</span>
                <span>{{ calculatedTax() | currencyFormat }}</span>
              </div>
              <div>
                <span class="block text-[10px] text-primary-400 font-bold">Total Orden</span>
                <span class="text-sm font-extrabold text-white">{{ calculatedTotal() | currencyFormat }}</span>
              </div>
            </div>
          </div>

          <!-- Notas -->
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Notas u Observaciones (Opcional)</label>
            <textarea
              formControlName="notes"
              rows="2"
              placeholder="Número de factura del proveedor, condiciones de entrega..."
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <app-button variant="outline" size="sm" type="button" (clicked)="onCancel()">
              Cancelar
            </app-button>
            <app-button
              variant="primary"
              size="sm"
              type="submit"
              [disabled]="form.invalid || itemsArray.length === 0 || isLoading()"
            >
              {{ isLoading() ? 'Procesando...' : 'Generar Orden de Compra' }}
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class PurchaseModalComponent implements OnInit {
  @Input() suppliers: Supplier[] = [];
  @Input() products: Product[] = [];
  @Input() loading: any = false;
  @Input() errorMessage: any = null;

  @Output() save = new EventEmitter<CreatePurchaseRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      supplierId: [null, [Validators.required]],
      purchaseDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
      notes: [''],
      autoReceive: [true],
      items: this.fb.array([])
    });

    // Agregar primera línea por defecto
    this.addItem();
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      productId: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [0.19]
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
    return subtotal * 1.19; // con IVA 19%
  }

  calculatedSubtotal(): number {
    return this.itemsArray.controls.reduce((acc, curr) => {
      const qty = Number(curr.get('quantity')?.value) || 0;
      const price = Number(curr.get('unitPrice')?.value) || 0;
      return acc + (qty * price);
    }, 0);
  }

  calculatedTax(): number {
    return this.calculatedSubtotal() * 0.19;
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
        taxRate: 0.19
      }))
    };

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
