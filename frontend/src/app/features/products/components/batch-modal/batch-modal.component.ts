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
  templateUrl: './batch-modal.component.html'
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
