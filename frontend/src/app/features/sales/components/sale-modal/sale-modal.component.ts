import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../../../core/models/product.model';
import { Customer } from '../../../../core/models/customer.model';
import { Warehouse } from '../../../../core/models/warehouse.model';
import { CreateSaleRequest, PaymentMethod, InvoiceType } from '../../../../core/models/sale.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppAutocompleteComponent, AutocompleteOption } from '../../../../shared/components/app-autocomplete/app-autocomplete.component';
import { ThousandsSeparatorDirective } from '../../../../shared/directives/thousands-separator.directive';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { emailFormatValidator, appEmailValidator } from '../../../../shared/validators';

import { CustomerService } from '../../../../core/services/customer.service';
import { SettingsService } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-sale-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppButtonComponent,
    AppAutocompleteComponent,
    ThousandsSeparatorDirective,
    CurrencyFormatPipe
  ],
  templateUrl: './sale-modal.component.html'
})
export class SaleModalComponent implements OnInit, OnChanges {
  @Input() products: Product[] = [];
  @Input() warehouses: Warehouse[] = [];
  @Input() defaultWarehouseId: number | null = null;
  @Input() loading: boolean = false;
  @Input() errorMessage: string | null = null;

  @Output() save = new EventEmitter<CreateSaleRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  registeredCustomers = signal<Customer[]>([]);
  isSearchingCustomer = signal<boolean>(false);
  customerSearchStatus = signal<'idle' | 'found' | 'not_found'>('idle');
  foundCustomerName = signal<string>('');
  autoRegisterCustomer = signal<boolean>(true);
  isRegisteringCustomer = signal<boolean>(false);

  taxRatePercent = signal<number>(19);
  taxRateDecimal = signal<number>(0.19);

  discountType = signal<'fixed' | 'percent'>('fixed');
  discountValue = signal<number>(0);

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private settingsService: SettingsService
  ) { }

  get warehouseOptions(): AutocompleteOption[] {
    return this.warehouses.map(w => ({
      value: w.id,
      label: `${w.name} (${w.code})`,
      sublabel: w.city || undefined
    }));
  }

  ngOnInit(): void {
    const initialWarehouseId = this.defaultWarehouseId || (this.warehouses.length > 0 ? this.warehouses[0].id : null);

    this.form = this.fb.group({
      customerName: ['', [Validators.required, Validators.maxLength(200)]],
      customerTaxId: [''],
      customerEmail: ['', [emailFormatValidator()]],
      paymentMethod: ['Cash', [Validators.required]],
      invoiceType: ['Traditional', [Validators.required]],
      warehouseId: [initialWarehouseId],
      saleDate: [{ value: new Date().toISOString().slice(0, 10), disabled: true }, [Validators.required]],
      notes: [''],
      items: this.fb.array([]),

      payments: this.fb.array([])
    });

    this.settingsService.getSettings().subscribe({
      next: (s) => {
        const rate = s.defaultTaxRate ?? 19;
        this.taxRatePercent.set(rate);
        this.taxRateDecimal.set(rate > 1 ? rate / 100 : rate);
        this.itemsArray.controls.forEach(control => {
          control.patchValue({ taxRate: this.taxRateDecimal() });
        });
      },
      error: () => { }
    });

    this.addItem();
    this.loadRegisteredCustomers();

    this.form.get('invoiceType')?.valueChanges.subscribe(type => {
      const emailCtrl = this.form.get('customerEmail');
      const taxCtrl = this.form.get('customerTaxId');

      if (type === 'Electronic') {
        emailCtrl?.setValidators([appEmailValidator(true)]);
        taxCtrl?.setValidators([Validators.required]);
      } else {
        emailCtrl?.setValidators([emailFormatValidator()]);
        taxCtrl?.clearValidators();
      }
      emailCtrl?.updateValueAndValidity();
      taxCtrl?.updateValueAndValidity();
    });

    this.form.get('customerTaxId')?.valueChanges.subscribe(val => {
      if (!val || !val.trim()) {
        this.customerSearchStatus.set('idle');
        this.foundCustomerName.set('');
      }
    });

    this.form.get('paymentMethod')?.valueChanges.subscribe(val => {
      if (val === 'Mixed') {
        if (!this.isSplitPayment()) {
          this.toggleSplitPayment();
        }
      } else if (this.isSplitPayment()) {
        this.isSplitPayment.set(false);
        this.paymentsArray.clear();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.form && (changes['defaultWarehouseId'] || changes['warehouses'])) {
      const currentVal = this.form.get('warehouseId')?.value;
      if (!currentVal && this.defaultWarehouseId) {
        this.form.patchValue({ warehouseId: this.defaultWarehouseId });
      } else if (!currentVal && this.warehouses.length > 0) {
        this.form.patchValue({ warehouseId: this.warehouses[0].id });
      }
    }
  }

  isSplitPayment = signal<boolean>(false);

  paymentMethodOptions: AutocompleteOption[] = [
    { value: 'Cash', label: 'Efectivo' },
    { value: 'Nequi', label: 'Nequi' },
    { value: 'Daviplata', label: 'Daviplata' },
    { value: 'CreditCard', label: 'Tarjeta de Crédito' },
    { value: 'DebitCard', label: 'Tarjeta de Débito' },
    { value: 'Transfer', label: 'Transferencia Bancaria / PSE' },
    { value: 'Credit', label: 'Crédito Comercial (30 días)' },
    { value: 'Mixed', label: 'Pago Mixto (Varios Medios)' }
  ];

  get individualPaymentMethodOptions(): AutocompleteOption[] {
    return this.paymentMethodOptions.filter(opt => opt.value !== 'Mixed');
  }

  invoiceTypeOptions: AutocompleteOption[] = [
    { value: 'Traditional', label: 'Tradicional' },
    { value: 'Electronic', label: 'Electrónica' }
  ];

  get customerOptions(): AutocompleteOption[] {
    return this.registeredCustomers().map(c => ({
      value: c.id,
      label: c.name,
      sublabel: c.taxId ? `NIT/CC: ${c.taxId}` : undefined
    }));
  }

  get productOptions(): AutocompleteOption[] {
    return this.products.map(p => ({
      value: p.id,
      label: `[${p.sku}] ${p.name}`,
      sublabel: `Stock: ${p.currentStock}`
    }));
  }

  loadRegisteredCustomers(): void {
    this.customerService.getCustomers({ pageSize: 100, isActive: true }).subscribe({
      next: (res) => this.registeredCustomers.set(res.items)
    });
  }

  onSelectCustomerFromDropdown(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const customerId = Number(select.value);
    this.onCustomerSelected(customerId);
  }

  onCustomerSelected(customerId: string | number | null): void {
    if (!customerId) return;

    const customer = this.registeredCustomers().find(c => c.id === Number(customerId));
    if (customer) {
      this.form.patchValue({
        customerTaxId: customer.taxId || '',
        customerName: customer.name,
        customerEmail: customer.email || ''
      });
      this.customerSearchStatus.set('found');
      this.foundCustomerName.set(customer.name);
    }
  }

  searchCustomerByTaxId(): void {
    const taxId = this.form.get('customerTaxId')?.value?.trim();
    if (!taxId) {
      this.customerSearchStatus.set('idle');
      return;
    }

    const localMatch = this.registeredCustomers().find(c =>
      c.taxId && c.taxId.trim().toLowerCase() === taxId.toLowerCase()
    );

    if (localMatch) {
      this.form.patchValue({
        customerName: localMatch.name,
        customerEmail: localMatch.email || ''
      });
      this.customerSearchStatus.set('found');
      this.foundCustomerName.set(localMatch.name);
      return;
    }

    this.isSearchingCustomer.set(true);
    this.customerService.getCustomers({ search: taxId, pageSize: 1 }).subscribe({
      next: (res) => {
        this.isSearchingCustomer.set(false);
        const match = res.items[0];

        if (match && match.taxId && match.taxId.trim().toLowerCase() === taxId.toLowerCase()) {
          this.form.patchValue({
            customerName: match.name,
            customerEmail: match.email || ''
          });
          this.customerSearchStatus.set('found');
          this.foundCustomerName.set(match.name);
        } else {
          this.customerSearchStatus.set('not_found');
          this.foundCustomerName.set('');
        }
      },
      error: () => {
        this.isSearchingCustomer.set(false);
        this.customerSearchStatus.set('not_found');
      }
    });
  }

  registerCustomerNow(): void {
    const name = this.form.get('customerName')?.value?.trim();
    const taxId = this.form.get('customerTaxId')?.value?.trim();
    const email = this.form.get('customerEmail')?.value?.trim();

    if (!name) return;

    this.isRegisteringCustomer.set(true);
    this.customerService.createCustomer({
      name,
      taxId: taxId || undefined,
      email: email || undefined
    }).subscribe({
      next: (created) => {
        this.isRegisteringCustomer.set(false);
        this.customerSearchStatus.set('found');
        this.foundCustomerName.set(created.name);
        this.loadRegisteredCustomers();
      },
      error: (err) => {
        this.isRegisteringCustomer.set(false);
        console.warn('Registro de cliente no completado:', err);
      }
    });
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get paymentsArray(): FormArray {
    return this.form.get('payments') as FormArray;
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      productId: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
      taxRate: [this.taxRateDecimal()]
    });

    itemGroup.get('productId')?.valueChanges.subscribe(prodId => {
      const prod = this.products.find(p => p.id === Number(prodId));
      if (prod) {
        itemGroup.patchValue({ unitPrice: prod.salePrice }, { emitEvent: false });
      } else if (!prodId) {
        itemGroup.patchValue({ unitPrice: 0 }, { emitEvent: false });
      }
    });

    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  canAddPaymentRow(): boolean {
    const total = this.calculatedTotal();
    if (total <= 0) return false;
    // No permitir agregar más medios de pago si lo seleccionado/asignado ya cubre o supera el valor total
    return this.remainingPayment() > 0.05;
  }

  suggestNextPaymentMethod(): string {
    const usedMethods = this.paymentsArray.controls.map(c => c.get('method')?.value);
    const available = this.individualPaymentMethodOptions.find(opt => !usedMethods.includes(opt.value));
    return available ? available.value : 'Nequi';
  }

  toggleSplitPayment(): void {
    const next = !this.isSplitPayment();
    this.isSplitPayment.set(next);

    if (next) {
      this.form.patchValue({ paymentMethod: 'Mixed' }, { emitEvent: false });
      if (this.paymentsArray.length === 0) {
        const currentMethod = this.form.get('paymentMethod')?.value;
        const firstMethod = (currentMethod && currentMethod !== 'Mixed') ? currentMethod : 'Cash';
        const secondMethod = firstMethod === 'Nequi' ? 'Cash' : 'Nequi';
        this.addPaymentRow(firstMethod, 0, true);
        this.addPaymentRow(secondMethod, 0, true);
      }
    } else {
      this.form.patchValue({ paymentMethod: 'Cash' }, { emitEvent: false });
      this.paymentsArray.clear();
    }
  }

  addPaymentRow(defaultMethod: string = 'Nequi', initialAmount: number = 0, force: boolean = false): void {
    // Restricción: Si ya se cubre el valor total de la venta, no permitir agregar más medios de pago
    if (!force && this.paymentsArray.length > 0 && !this.canAddPaymentRow()) {
      return;
    }
    const paymentGroup = this.fb.group({
      method: [defaultMethod, [Validators.required]],
      amount: [initialAmount, [Validators.required, Validators.min(0.01)]],
      reference: ['']
    });
    this.paymentsArray.push(paymentGroup);
  }

  removePayment(index: number): void {
    if (this.paymentsArray.length > 1) {
      this.paymentsArray.removeAt(index);
    }
  }

  totalPaid(): number {
    if (!this.isSplitPayment()) {
      return this.calculatedTotal();
    }
    return this.paymentsArray.controls.reduce((sum, curr) => {
      const amt = Number(curr.get('amount')?.value) || 0;
      return sum + amt;
    }, 0);
  }

  remainingPayment(): number {
    return this.calculatedTotal() - this.totalPaid();
  }

  fillRemainingAmount(index: number): void {
    const currentControl = this.paymentsArray.at(index);
    const currentVal = Number(currentControl.get('amount')?.value) || 0;
    const remaining = this.remainingPayment();
    const newAmount = Math.max(0, currentVal + remaining);
    currentControl.patchValue({ amount: newAmount });
  }

  isPaymentBalanced(): boolean {
    if (!this.isSplitPayment()) return true;
    return Math.abs(this.calculatedTotal() - this.totalPaid()) < 0.05 && this.paymentsArray.length > 0;
  }

  onProductSelect(index: number, selectedProductId?: string | number | null): void {
    const group = this.itemsArray.at(index);
    if (!group) return;

    const prodId = (selectedProductId !== undefined && selectedProductId !== null)
      ? Number(selectedProductId)
      : Number(group.get('productId')?.value);

    const prod = this.products.find(p => p.id === prodId);
    if (prod) {
      group.patchValue({
        productId: prod.id,
        unitPrice: prod.salePrice
      });
    } else if (!prodId) {
      group.patchValue({
        productId: null,
        unitPrice: 0
      });
    }
  }

  getSelectedProduct(index: number): Product | undefined {
    const group = this.itemsArray.at(index);
    if (!group) return undefined;
    const prodId = Number(group.get('productId')?.value);
    return this.products.find(p => p.id === prodId);
  }

  isLineStockExceeded(index: number): boolean {
    const prod = this.getSelectedProduct(index);
    if (!prod) return false;
    const group = this.itemsArray.at(index);
    const qty = Number(group?.get('quantity')?.value) || 0;
    return qty > prod.currentStock;
  }

  anyStockExceeded(): boolean {
    return this.itemsArray.controls.some((_, i) => this.isLineStockExceeded(i));
  }

  getLineTotal(index: number): number {
    const group = this.itemsArray.at(index);
    if (!group) return 0;
    const raw = group.getRawValue();
    const qty = Number(raw.quantity) || 0;
    const price = Number(raw.unitPrice) || 0;
    const subtotal = qty * price;
    return subtotal * (1 + this.taxRateDecimal());
  }

  setDiscountType(type: 'fixed' | 'percent'): void {
    this.discountType.set(type);
    if (type === 'percent' && this.discountValue() > 100) {
      this.discountValue.set(100);
    }
  }

  setQuickDiscount(percent: number): void {
    this.discountType.set('percent');
    this.discountValue.set(percent);
  }

  clearDiscount(): void {
    this.discountValue.set(0);
  }

  onDiscountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    this.discountValue.set(isNaN(num) || num < 0 ? 0 : num);
  }

  calculatedSubtotal(): number {
    return this.itemsArray.controls.reduce((acc, curr) => {
      const raw = curr.getRawValue();
      const qty = Number(raw.quantity) || 0;
      const price = Number(raw.unitPrice) || 0;
      return acc + (qty * price);
    }, 0);
  }

  calculatedDiscount(): number {
    const sub = this.calculatedSubtotal();
    const val = Number(this.discountValue()) || 0;
    if (val <= 0 || sub <= 0) return 0;
    if (this.discountType() === 'percent') {
      const clampedPercent = Math.min(100, Math.max(0, val));
      return Math.round((sub * clampedPercent / 100) * 100) / 100;
    }
    return Math.min(sub, Math.max(0, val));
  }

  taxableBase(): number {
    return Math.max(0, this.calculatedSubtotal() - this.calculatedDiscount());
  }

  calculatedTax(): number {
    return Math.round((this.taxableBase() * this.taxRateDecimal()) * 100) / 100;
  }

  calculatedTotal(): number {
    return Math.round((this.taxableBase() + this.calculatedTax()) * 100) / 100;
  }

  isDiscountExceeded(): boolean {
    const val = Number(this.discountValue()) || 0;
    if (val < 0) return true;
    if (this.discountType() === 'percent') {
      return val > 100;
    }
    return val > this.calculatedSubtotal();
  }

  isLoading(): boolean {
    return !!this.loading;
  }

  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.anyStockExceeded() || this.isDiscountExceeded() || !this.isPaymentBalanced()) return;

    const rawVal = this.form.getRawValue();
    const name = rawVal.customerName.trim();
    const taxId = rawVal.customerTaxId?.trim();
    const email = rawVal.customerEmail?.trim();

    if (this.customerSearchStatus() === 'not_found' && this.autoRegisterCustomer() && name && taxId) {
      try {
        this.isRegisteringCustomer.set(true);
        const created = await firstValueFrom(this.customerService.createCustomer({
          name: name,
          taxId: taxId,
          email: email || undefined
        }));
        this.customerSearchStatus.set('found');
        this.foundCustomerName.set(created.name);
      } catch (err) {
        console.warn('Auto-registro omitido o fallido:', err);
      } finally {
        this.isRegisteringCustomer.set(false);
      }
    }

    let finalMethod: PaymentMethod = rawVal.paymentMethod as PaymentMethod;
    let finalPayments = undefined;

    if (this.isSplitPayment() && this.paymentsArray.length > 0) {
      finalMethod = 'Mixed' as PaymentMethod;
      finalPayments = this.paymentsArray.controls.map(p => ({
        method: p.get('method')?.value,
        amount: Number(p.get('amount')?.value) || 0,
        reference: p.get('reference')?.value?.trim() || undefined
      }));
    } else {
      finalPayments = [{
        method: finalMethod,
        amount: this.calculatedTotal()
      }];
    }

    const request: CreateSaleRequest = {
      customerName: name,
      customerTaxId: taxId || undefined,
      customerEmail: email || undefined,
      paymentMethod: finalMethod,
      invoiceType: rawVal.invoiceType as InvoiceType,
      saleDate: new Date().toISOString(),
      notes: rawVal.notes?.trim() || undefined,
      items: rawVal.items.map((i: { productId: number | string; quantity: number | string; unitPrice: number | string }) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        taxRate: this.taxRateDecimal()
      })),
      discount: this.calculatedDiscount(),
      payments: finalPayments,
      warehouseId: rawVal.warehouseId ? Number(rawVal.warehouseId) : undefined
    };

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
