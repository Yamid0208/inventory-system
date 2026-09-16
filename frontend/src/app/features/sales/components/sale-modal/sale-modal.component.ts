import { Component, EventEmitter, Input, OnInit, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../../../core/models/product.model';
import { Customer } from '../../../../core/models/customer.model';
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
export class SaleModalComponent implements OnInit {
  @Input() products: Product[] = [];
  @Input() loading: any = false;
  @Input() errorMessage: any = null;

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

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      customerName: ['', [Validators.required, Validators.maxLength(200)]],
      customerTaxId: [''],
      customerEmail: ['', [emailFormatValidator()]],
      paymentMethod: ['Cash', [Validators.required]],
      invoiceType: ['Traditional', [Validators.required]],
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
      error: () => {}
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
  }

  isSplitPayment = signal<boolean>(false);

  paymentMethodOptions: AutocompleteOption[] = [
    { value: 'Cash', label: 'Efectivo' },
    { value: 'Nequi', label: 'Nequi' },
    { value: 'Daviplata', label: 'Daviplata' },
    { value: 'CreditCard', label: 'Tarjeta de Crédito' },
    { value: 'DebitCard', label: 'Tarjeta de Débito' },
    { value: 'Transfer', label: 'Transferencia Bancaria / PSE' },
    { value: 'Credit', label: 'Crédito Comercial (30 días)' }
  ];

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

  onCustomerSelected(customerId: any): void {
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
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [this.taxRateDecimal()]
    });
    // Inserción al inicio para que el nuevo producto aparezca arriba
    this.itemsArray.insert(0, itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  toggleSplitPayment(): void {
    const next = !this.isSplitPayment();
    this.isSplitPayment.set(next);

    if (next) {
      if (this.paymentsArray.length === 0) {
        const total = this.calculatedTotal();
        const half1 = Math.floor(total / 2);
        const half2 = total - half1;
        this.addPaymentRow('Cash', half1 > 0 ? half1 : total);
        this.addPaymentRow('Nequi', half2 > 0 ? half2 : 0);
      }
    } else {
      this.paymentsArray.clear();
    }
  }

  addPaymentRow(defaultMethod: string = 'Cash', initialAmount: number = 0): void {
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

  onProductSelect(index: number): void {
    const group = this.itemsArray.at(index);
    const prodId = Number(group.get('productId')?.value);
    const prod = this.products.find(p => p.id === prodId);
    if (prod) {
      group.patchValue({ unitPrice: prod.salePrice });
    }
  }

  getSelectedProduct(index: number): Product | undefined {
    const group = this.itemsArray.at(index);
    const prodId = Number(group.get('productId')?.value);
    return this.products.find(p => p.id === prodId);
  }

  isLineStockExceeded(index: number): boolean {
    const prod = this.getSelectedProduct(index);
    if (!prod) return false;
    const qty = Number(this.itemsArray.at(index).get('quantity')?.value) || 0;
    return qty > prod.currentStock;
  }

  anyStockExceeded(): boolean {
    return this.itemsArray.controls.some((_, i) => this.isLineStockExceeded(i));
  }

  getLineTotal(index: number): number {
    const group = this.itemsArray.at(index);
    const qty = Number(group.get('quantity')?.value) || 0;
    const price = Number(group.get('unitPrice')?.value) || 0;
    const subtotal = qty * price;
    return subtotal * (1 + this.taxRateDecimal());
  }

  calculatedSubtotal(): number {
    return this.itemsArray.controls.reduce((acc, curr) => {
      const qty = Number(curr.get('quantity')?.value) || 0;
      const price = Number(curr.get('unitPrice')?.value) || 0;
      return acc + (qty * price);
    }, 0);
  }

  calculatedTax(): number {
    return this.calculatedSubtotal() * this.taxRateDecimal();
  }

  calculatedTotal(): number {
    return this.calculatedSubtotal() + this.calculatedTax();
  }

  isLoading(): boolean {
    return typeof this.loading === 'function' ? this.loading() : !!this.loading;
  }

  getErrorMessage(): string | null {
    return typeof this.errorMessage === 'function' ? this.errorMessage() : this.errorMessage;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.anyStockExceeded() || !this.isPaymentBalanced()) return;

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
      items: rawVal.items.map((i: any) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        taxRate: this.taxRateDecimal()
      })),
      payments: finalPayments
    };

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
