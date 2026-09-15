import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Purchase } from '../../../../core/models/purchase.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-purchase-detail-modal',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, CurrencyFormatPipe],
  templateUrl: './purchase-detail-modal.component.html'
})
export class PurchaseDetailModalComponent {
  @Input({ required: true }) purchase!: Purchase;
  @Output() close = new EventEmitter<void>();
  @Output() receive = new EventEmitter<number>();

  onClose(): void {
    this.close.emit();
  }

  onReceive(): void {
    this.receive.emit(this.purchase.id);
  }
}
