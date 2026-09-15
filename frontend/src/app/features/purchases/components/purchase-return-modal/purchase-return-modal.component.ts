import { Component, EventEmitter, Input, OnInit, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Purchase, PurchaseItem, ReturnPurchaseRequest } from '../../../../core/models/purchase.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppAutocompleteComponent, AutocompleteOption } from '../../../../shared/components/app-autocomplete/app-autocomplete.component';
import { ThousandsSeparatorDirective } from '../../../../shared/directives/thousands-separator.directive';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { ConfirmationService } from '../../../../core/services/confirmation.service';

@Component({
  selector: 'app-purchase-return-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppButtonComponent,
    AppAutocompleteComponent,
    ThousandsSeparatorDirective,
    CurrencyFormatPipe
  ],
  templateUrl: './purchase-return-modal.component.html'
})
export class PurchaseReturnModalComponent implements OnInit {
  @Input({ required: true }) purchase!: Purchase;
  @Input() loading = signal<boolean>(false);
  @Input() errorMessage = signal<string | null>(null);

  @Output() confirmReturn = new EventEmitter<ReturnPurchaseRequest>();
  @Output() cancel = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService
  ) {}

  form!: FormGroup;

  reasonOptions: AutocompleteOption[] = [
    { value: 'Mercancía con defecto de fábrica', label: 'Mercancía con defecto de fábrica' },
    { value: 'No corresponde a las especificaciones solicitadas', label: 'No corresponde a las especificaciones' },
    { value: 'Exceso de despacho / Despacho erróneo', label: 'Exceso o error de despacho' },
    { value: 'Avería durante el transporte', label: 'Avería durante el transporte' },
    { value: 'Garantía comercial con proveedor', label: 'Garantía comercial con proveedor' },
    { value: 'Producto en mal estado o vencido', label: 'Producto en mal estado o vencido' },
    { value: 'Otro motivo justificado', label: 'Otro motivo justificado' }
  ];

  ngOnInit(): void {
    const itemGroups = this.purchase.items.map(item => this.fb.group({
      selected: [false],
      productId: [item.productId],
      productSku: [item.productSku],
      productName: [item.productName],
      purchasedQuantity: [item.quantity],
      unitPrice: [item.unitPrice],
      returnQuantity: [1, [Validators.min(1), Validators.max(item.quantity)]]
    }));

    this.form = this.fb.group({
      reason: ['', [Validators.required]],
      notes: [''],
      items: this.fb.array(itemGroups)
    });
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get selectedCount(): number {
    return this.itemsArray.controls.filter(ctrl => ctrl.get('selected')?.value).length;
  }

  get totalUnitsToReturn(): number {
    return this.itemsArray.controls
      .filter(ctrl => ctrl.get('selected')?.value)
      .reduce((sum, ctrl) => sum + (Number(ctrl.get('returnQuantity')?.value) || 0), 0);
  }

  get totalAmountToReturn(): number {
    return this.itemsArray.controls
      .filter(ctrl => ctrl.get('selected')?.value)
      .reduce((sum, ctrl) => {
        const qty = Number(ctrl.get('returnQuantity')?.value) || 0;
        const price = Number(ctrl.get('unitPrice')?.value) || 0;
        return sum + (qty * price);
      }, 0);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.itemsArray.controls.forEach(ctrl => {
      ctrl.patchValue({ selected: checked });
    });
  }

  hasInvalidReturnQuantities(): boolean {
    return this.itemsArray.controls.some(ctrl => {
      if (!ctrl.get('selected')?.value) return false;
      const returnQty = Number(ctrl.get('returnQuantity')?.value) || 0;
      const maxQty = Number(ctrl.get('purchasedQuantity')?.value) || 0;
      return returnQty <= 0 || returnQty > maxQty;
    });
  }

  isLineExceeded(itemGroup: any): boolean {
    return Number(itemGroup.get('returnQuantity')?.value) > Number(itemGroup.get('purchasedQuantity')?.value);
  }

  getLineSubtotal(itemGroup: any): number {
    return (Number(itemGroup.get('returnQuantity')?.value) || 0) * (Number(itemGroup.get('unitPrice')?.value) || 0);
  }

  async onSubmit(): Promise<void> {
    if (this.form.get('reason')?.invalid) {
      this.form.get('reason')?.markAsTouched();
      return;
    }

    if (this.selectedCount === 0) {
      return;
    }

    if (this.hasInvalidReturnQuantities()) {
      return;
    }

    const val = this.form.value;
    const selectedItems = (val.items as any[])
      .filter(i => i.selected && Number(i.returnQuantity) > 0)
      .map(i => ({
        productId: Number(i.productId),
        quantity: Number(i.returnQuantity)
      }));

    if (selectedItems.length === 0) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Confirmar Devolución a Proveedor',
      message: `¿Estás seguro de devolver ${this.totalUnitsToReturn} unidad(es) de la compra ${this.purchase.purchaseNumber}? Esta acción retirará las unidades del inventario inmediatamente.`,
      confirmText: 'Sí, confirmar devolución',
      cancelText: 'Volver',
      variant: 'danger'
    });

    if (confirmed) {
      const req: ReturnPurchaseRequest = {
        reason: val.reason,
        items: selectedItems,
        notes: val.notes?.trim() || undefined
      };
      this.confirmReturn.emit(req);
    }
  }
}
