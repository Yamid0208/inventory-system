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
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div class="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto transition-all">
        <!-- Encabezado -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900">Ajuste Manual de Inventario</h2>
              <p class="text-xs text-slate-500">Registra entradas o salidas físicas con trazabilidad en Kardex.</p>
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

        <!-- Alerta de Error de API -->
        @if (getErrorMessage()) {
          <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <svg class="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="font-medium">{{ getErrorMessage() }}</span>
          </div>
        }

        <!-- Formulario Reactivo -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 text-xs">
          <!-- Producto -->
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Producto a Ajustar *</label>
            <select
              formControlName="productId"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
            >
              <option [value]="null">Seleccionar producto del catálogo...</option>
              @for (prod of products; track prod.id) {
                <option [value]="prod.id">
                  [{{ prod.sku }}] {{ prod.name }} (Stock actual: {{ prod.currentStock }})
                </option>
              }
            </select>
          </div>

          <!-- Tipo de Ajuste: Entrada / Salida (Segmented Control) -->
          <div>
            <label class="block font-semibold text-slate-700 mb-1.5">Tipo de Movimiento *</label>
            <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                (click)="setAdjustmentType('AdjustmentIn')"
                class="py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                [class]="form.get('adjustmentType')?.value === 'AdjustmentIn'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'"
              >
                <span>↓ Entrada (+ Stock)</span>
              </button>
              <button
                type="button"
                (click)="setAdjustmentType('AdjustmentOut')"
                class="py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                [class]="form.get('adjustmentType')?.value === 'AdjustmentOut'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'"
              >
                <span>↑ Salida (- Stock)</span>
              </button>
            </div>
          </div>

          <!-- Cantidad y Stock Resultante -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Cantidad de Unidades *</label>
              <input
                type="number"
                formControlName="quantity"
                min="1"
                placeholder="Ej. 10"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>

            <!-- Stock Resultante Calculado -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Stock Proyectado</label>
              <div
                class="w-full px-3 py-2 rounded-xl border font-mono font-bold flex items-center justify-between"
                [class]="isNegativeStock()
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-800'"
              >
                <span>{{ projectedStock() }} un.</span>
                <span class="text-[10px] font-normal" [class]="isNegativeStock() ? 'text-rose-600' : 'text-slate-400'">
                  {{ isNegativeStock() ? '¡Inválido (RN-001)!' : 'Stock final' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Alerta RN-001 si Salida supera stock disponible -->
          @if (isNegativeStock()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span><strong>Restricción RN-001:</strong> La cantidad a retirar no puede exceder el stock disponible actual.</span>
            </div>
          }

          <!-- Motivo del Ajuste -->
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Motivo o Referencia *</label>
            <select
              formControlName="reason"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
            >
              <option value="">Seleccionar motivo justificado...</option>
              <option value="Conteo Físico / Auditoría">Conteo Físico / Auditoría Periódica</option>
              <option value="Merma / Producto Dañado">Merma / Producto Dañado en Bodega</option>
              <option value="Muestra Comercial / Demo">Muestra Comercial / Demostración</option>
              <option value="Corrección de Inventario">Corrección de Error de Registro</option>
              <option value="Devolución Interna">Devolución Interna de Taller/Oficina</option>
              <option value="Otro Motivo">Otro Motivo Justificado</option>
            </select>
          </div>

          <!-- Observaciones / Notas -->
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Observaciones Detalladas (Opcional)</label>
            <textarea
              formControlName="notes"
              rows="2"
              placeholder="Detalles adicionales sobre el ajuste, responsable o lote..."
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Botones de Acción -->
          <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <app-button variant="outline" size="sm" type="button" (clicked)="onCancel()">
              Cancelar
            </app-button>
            <app-button
              variant="primary"
              size="sm"
              type="submit"
              [disabled]="form.invalid || isNegativeStock() || isLoading()"
            >
              {{ isLoading() ? 'Registrando...' : 'Confirmar Ajuste' }}
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `
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
