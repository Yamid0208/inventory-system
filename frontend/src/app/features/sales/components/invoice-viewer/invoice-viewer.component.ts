import { Component, EventEmitter, Input, Output, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Sale } from '../../../../core/models/sale.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-invoice-viewer',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, CurrencyFormatPipe, DatePipe],
  styles: [`
    @media print {
      :host {
        display: block !important;
        position: static !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .invoice-modal-backdrop {
        position: static !important;
        background: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .invoice-modal-card {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        max-height: none !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        background: transparent !important;
      }
      .invoice-scroll-area {
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
        padding: 0 !important;
      }
    }
  `],
  templateUrl: './invoice-viewer.component.html'
})
export class InvoiceViewerComponent implements AfterViewInit {
  @Input() sale: Sale | null = null;
  @Input() autoPrint = false;
  @Output() close = new EventEmitter<void>();

  ngAfterViewInit(): void {
    if (this.autoPrint) {
      // Breve pausa para asegurar renderizado completo en el DOM antes de invocar diálogo de impresión nativo
      setTimeout(() => {
        this.onPrint();
      }, 350);
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onPrint(): void {
    window.print();
  }

  getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'Cash': return 'Efectivo';
      case 'CreditCard': return 'Tarjeta';
      case 'Transfer': return 'Transferencia';
      case 'Credit': return 'Crédito';
      default: return method;
    }
  }
}
