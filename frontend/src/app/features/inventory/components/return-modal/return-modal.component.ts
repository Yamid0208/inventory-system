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
  templateUrl: './return-modal.component.html'
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
