import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sale } from '../../../../core/models/sale.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-sale-detail-modal',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, CurrencyFormatPipe],
  templateUrl: './sale-detail-modal.component.html'
})
export class SaleDetailModalComponent {
  @Input({ required: true }) sale!: Sale;
  @Output() close = new EventEmitter<void>();
  @Output() cancelSale = new EventEmitter<number>();

  onClose(): void {
    this.close.emit();
  }

  onCancelSale(): void {
    this.cancelSale.emit(this.sale.id);
  }

  printInvoice(): void {
    window.print();
  }

  getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'Cash': return 'Efectivo';
      case 'CreditCard': return 'Tarjeta de Crédito/Débito';
      case 'Transfer': return 'Transferencia Bancaria';
      case 'Credit': return 'Crédito Comercial (30 días)';
      default: return method;
    }
  }
}
