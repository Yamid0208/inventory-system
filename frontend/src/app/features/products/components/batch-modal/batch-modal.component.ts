import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BatchService } from '../../../../core/services/batch.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Product, ProductBatch, CreateProductBatchRequest } from '../../../../core/models/product.model';

@Component({
  selector: 'app-batch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="batch-modal-title">
        <!-- HEADER -->
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
              🏷️
            </div>
            <div>
              <h3 id="batch-modal-title" class="text-base font-bold text-slate-900">Gestión de Lotes y Vencimientos</h3>
              <p class="text-xs text-slate-400">Producto: <strong class="text-slate-700">{{ product.sku }} — {{ product.name }}</strong></p>
            </div>
          </div>
          <button type="button" (click)="closed.emit()" class="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div class="p-6 space-y-6">
          <!-- FORMULARIO NUEVO LOTE -->
          <form (ngSubmit)="submitBatch()" class="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              Registrar Nuevo Lote
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Código de Lote *</label>
                <input
                  type="text"
                  [(ngModel)]="newBatchNumber"
                  name="newBatchNumber"
                  required
                  placeholder="LOTE-2026-A"
                  class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Vencimiento *</label>
                <input
                  type="date"
                  [(ngModel)]="newExpirationDate"
                  name="newExpirationDate"
                  required
                  class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Cantidad Inicial *</label>
                <div class="flex gap-2">
                  <input
                    type="number"
                    [(ngModel)]="newQuantity"
                    name="newQuantity"
                    min="1"
                    required
                    placeholder="100"
                    class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                  />
                  <button
                    type="submit"
                    [disabled]="creating() || !newBatchNumber.trim() || !newExpirationDate || newQuantity < 1"
                    class="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {{ creating() ? '...' : 'Añadir' }}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <!-- TABLA DE LOTES (ORDENADOS POR FEFO) -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold text-slate-800">Lotes Activos (Orden FEFO — Primer Vencimiento Primero)</h4>
              <span class="text-[11px] text-slate-400">{{ batches().length }} lote(s) registrado(s)</span>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                    <th class="py-2.5 px-3">Lote</th>
                    <th class="py-2.5 px-3">Caducidad</th>
                    <th class="py-2.5 px-3 text-center">Estado</th>
                    <th class="py-2.5 px-3 text-right">Cant. Actual</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @if (loading()) {
                    <tr>
                      <td colspan="4" class="py-6 text-center text-slate-400">Cargando lotes...</td>
                    </tr>
                  } @else if (batches().length === 0) {
                    <tr>
                      <td colspan="4" class="py-6 text-center text-slate-400">No hay lotes registrados para este producto.</td>
                    </tr>
                  } @else {
                    @for (batch of batches(); track batch.id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-2.5 px-3 font-semibold text-slate-800">{{ batch.batchNumber }}</td>
                        <td class="py-2.5 px-3 text-slate-600">{{ batch.expirationDate | date:'yyyy-MM-dd' }}</td>
                        <td class="py-2.5 px-3 text-center">
                          @switch (batch.status) {
                            @case ('Expired') {
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                ✕ Vencido (hace {{ Math.abs(batch.daysToExpiration) }}d)
                              </span>
                            }
                            @case ('ExpiringSoon') {
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                ⏳ Vence en {{ batch.daysToExpiration }}d
                              </span>
                            }
                            @case ('Good') {
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ {{ batch.daysToExpiration }} días
                              </span>
                            }
                          }
                        </td>
                        <td class="py-2.5 px-3 text-right font-bold text-slate-800">
                          {{ batch.currentQuantity }} / {{ batch.initialQuantity }}
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            type="button"
            (click)="closed.emit()"
            class="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `
})
export class BatchModalComponent implements OnInit {
  @Input({ required: true }) product!: Product;
  @Output() closed = new EventEmitter<void>();

  private batchService = inject(BatchService);
  private notificationService = inject(NotificationService);

  readonly Math = Math;

  batches = signal<ProductBatch[]>([]);
  loading = signal<boolean>(false);
  creating = signal<boolean>(false);

  newBatchNumber = '';
  newExpirationDate = '';
  newQuantity = 10;

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    if (!this.product?.id) return;
    this.loading.set(true);
    this.batchService.getBatches(this.product.id).subscribe({
      next: (data) => {
        this.batches.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de lotes.');
      }
    });
  }

  submitBatch(): void {
    if (!this.newBatchNumber.trim() || !this.newExpirationDate || this.newQuantity < 1) return;

    this.creating.set(true);
    const req: CreateProductBatchRequest = {
      batchNumber: this.newBatchNumber.trim(),
      expirationDate: new Date(this.newExpirationDate).toISOString(),
      initialQuantity: Number(this.newQuantity)
    };

    this.batchService.createBatch(this.product.id, req).subscribe({
      next: (batch) => {
        this.creating.set(false);
        this.notificationService.success(`Lote ${batch.batchNumber} agregado con éxito.`);
        this.newBatchNumber = '';
        this.newExpirationDate = '';
        this.newQuantity = 10;
        this.loadBatches();
      },
      error: (err) => {
        this.creating.set(false);
        const detail = err.error?.detail || err.error?.message || 'Error al registrar el lote.';
        this.notificationService.error(detail, 'Error en Registro');
      }
    });
  }
}
