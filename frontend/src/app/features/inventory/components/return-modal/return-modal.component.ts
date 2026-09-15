import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../core/services/product.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Product } from '../../../../core/models/product.model';
import { ProcessReturnRequest } from '../../../../core/models/inventory.model';

@Component({
  selector: 'app-return-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
      <div class="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto my-auto" role="dialog" aria-modal="true" aria-labelledby="return-modal-title">
        <!-- CABECERA -->
        <div class="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-lg">
              🔄
            </div>
            <div>
              <h3 id="return-modal-title" class="text-base font-bold text-slate-900">Registrar Devolución de Inventario</h3>
              <p class="text-xs text-slate-400">Reingreso por cliente o retorno de mercancía a proveedor.</p>
            </div>
          </div>
          <button type="button" (click)="closed.emit()" class="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100">
            ✕
          </button>
        </div>

        <!-- FORMULARIO -->
        <form (ngSubmit)="submit()" class="p-6 space-y-4">
          <!-- TIPO DE DEVOLUCIÓN -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Naturaleza de la Devolución *</label>
            <div class="grid grid-cols-2 gap-3">
              <label
                class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-medium"
                [ngClass]="returnType === 'CustomerReturn' ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900 ring-2 ring-emerald-200' : 'bg-slate-50 border-slate-200 text-slate-700'"
              >
                <input type="radio" name="returnType" [(ngModel)]="returnType" value="CustomerReturn" class="sr-only" />
                <span class="text-base">📥</span>
                <div>
                  <strong class="block text-xs">De Cliente</strong>
                  <span class="text-[10px] text-slate-400">Reingreso (+)</span>
                </div>
              </label>

              <label
                class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-medium"
                [ngClass]="returnType === 'SupplierReturn' ? 'bg-amber-50/60 border-amber-300 text-amber-900 ring-2 ring-amber-200' : 'bg-slate-50 border-slate-200 text-slate-700'"
              >
                <input type="radio" name="returnType" [(ngModel)]="returnType" value="SupplierReturn" class="sr-only" />
                <span class="text-base">📤</span>
                <div>
                  <strong class="block text-xs">A Proveedor</strong>
                  <span class="text-[10px] text-slate-400">Salida (-) [RN-001]</span>
                </div>
              </label>
            </div>
          </div>

          <!-- SELECCIÓN DE PRODUCTO -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Producto Afectado *</label>
            <select
              [(ngModel)]="selectedProductId"
              name="selectedProductId"
              required
              (change)="onProductSelected()"
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
            >
              <option [ngValue]="null" disabled selected>Seleccione un producto...</option>
              @for (p of products(); track p.id) {
                <option [ngValue]="p.id">{{ p.sku }} — {{ p.name }} (Stock: {{ p.currentStock }})</option>
              }
            </select>
          </div>

          <!-- STOCK PREVIO Y CANTIDAD -->
          @if (selectedProduct()) {
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span class="text-slate-500">Existencias Actuales:</span>
              <span class="font-bold text-slate-800">{{ selectedProduct()?.currentStock }} unidades</span>
            </div>
          }

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Cantidad Devuelta *</label>
              <input
                type="number"
                [(ngModel)]="quantity"
                name="quantity"
                min="1"
                required
                placeholder="1"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Doc. Referencia</label>
              <input
                type="text"
                [(ngModel)]="referenceDocument"
                name="referenceDocument"
                placeholder="FAC-0001 / OC-0001"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <!-- MOTIVO -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Motivo / Causa de la Devolución *</label>
            <select
              [(ngModel)]="reason"
              name="reason"
              required
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
            >
              <option value="Producto con defecto de fábrica">Producto con defecto de fábrica</option>
              <option value="Garantía de calidad / Inconformidad">Garantía de calidad / Inconformidad</option>
              <option value="Error en despacho o cantidad">Error en despacho o cantidad</option>
              <option value="Cancelación de compra o venta">Cancelación de compra o venta</option>
              <option value="Avería durante transporte">Avería durante transporte</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Observaciones Detalladas</label>
            <textarea
              [(ngModel)]="notes"
              name="notes"
              rows="2"
              placeholder="Detalle técnico de la devolución o informe de inspección..."
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
            ></textarea>
          </div>

          <!-- ACCIONES -->
          <div class="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              (click)="closed.emit()"
              class="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="loading() || !selectedProductId || quantity < 1"
              class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
            >
              @if (loading()) {
                <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando...</span>
              } @else {
                <span>Confirmar Devolución</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ReturnModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private productService = inject(ProductService);
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  products = signal<Product[]>([]);
  selectedProductId: number | null = null;
  selectedProduct = signal<Product | null>(null);

  returnType: 'CustomerReturn' | 'SupplierReturn' = 'CustomerReturn';
  quantity = 1;
  reason = 'Producto con defecto de fábrica';
  referenceDocument = '';
  notes = '';
  loading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts({ pageNumber: 1, pageSize: 100, isActive: true }).subscribe({
      next: (res) => this.products.set(res.items),
      error: () => this.notificationService.error('Error al cargar la lista de productos.')
    });
  }

  onProductSelected(): void {
    const prod = this.products().find(p => p.id === this.selectedProductId) || null;
    this.selectedProduct.set(prod);
  }

  submit(): void {
    if (!this.selectedProductId || this.quantity < 1) return;

    this.loading.set(true);

    const req: ProcessReturnRequest = {
      productId: this.selectedProductId,
      returnType: this.returnType,
      quantity: Number(this.quantity),
      reason: this.reason,
      referenceDocument: this.referenceDocument.trim() || undefined,
      notes: this.notes.trim() || undefined
    };

    this.inventoryService.processReturn(req).subscribe({
      next: (mov) => {
        this.loading.set(false);
        const deltaTxt = mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : `${mov.quantityDelta}`;
        this.notificationService.success(`Devolución ${mov.movementNumber} registrada con éxito (${deltaTxt} uds). Nuevo stock: ${mov.newStock}.`);
        this.saved.emit();
        this.closed.emit();
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err.error?.detail || err.error?.message || 'Error al procesar la devolución.';
        this.notificationService.error(detail, 'Error en Devolución');
      }
    });
  }
}
