import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../core/models/product.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, CurrencyFormatPipe],
  templateUrl: './product-detail-modal.component.html'
})
export class ProductDetailModalComponent {
  @Input({ required: true }) product!: Product;
  @Output() close = new EventEmitter<void>();
}
