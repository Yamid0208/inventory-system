import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../core/services/product.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Product } from '../../../../core/models/product.model';
import { ProcessReturnRequest } from '../../../../core/models/inventory.model';

import { AppAutocompleteComponent, AutocompleteOption } from '../../../../shared/components/app-autocomplete/app-autocomplete.component';
import { ThousandsSeparatorDirective } from '../../../../shared/directives/thousands-separator.directive';

@Component({
  selector: 'app-return-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppAutocompleteComponent, ThousandsSeparatorDirective],
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

  reasonOptions: AutocompleteOption[] = [
    { value: 'Producto con defecto de fábrica', label: 'Producto con defecto de fábrica' },
    { value: 'Garantía de calidad / Inconformidad', label: 'Garantía de calidad / Inconformidad' },
    { value: 'Error en despacho o cantidad', label: 'Error en despacho o cantidad' },
    { value: 'Cancelación de compra o venta', label: 'Cancelación de compra o venta' },
    { value: 'Avería durante transporte', label: 'Avería durante transporte' }
  ];

  get productOptions(): AutocompleteOption[] {
    return this.products().map(p => ({
      value: p.id,
      label: `${p.sku} — ${p.name}`,
      sublabel: `Stock: ${p.currentStock}`
    }));
  }

  onProductChange(val: any): void {
    this.selectedProductId = val ? Number(val) : null;
    this.onProductSelected();
  }

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
