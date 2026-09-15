import { Component, EventEmitter, Input, OnInit, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../../../core/models/product.model';
import { Customer } from '../../../../core/models/customer.model';
import { CreateSaleRequest, PaymentMethod, InvoiceType } from '../../../../core/models/sale.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { CustomerService } from '../../../../core/services/customer.service';
import { SettingsService } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-sale-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, CurrencyFormatPipe],
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
      customerEmail: ['', [Validators.email]],
      paymentMethod: ['Cash', [Validators.required]],
      invoiceType: ['Traditional', [Validators.required]],
      saleDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
      notes: [''],
      items: this.fb.array([])
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
        emailCtrl?.setValidators([Validators.required, Validators.email]);
        taxCtrl?.setValidators([Validators.required]);
      } else {
        emailCtrl?.setValidators([Validators.email]);
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

  loadRegisteredCustomers(): void {
    this.customerService.getCustomers({ pageSize: 100, isActive: true }).subscribe({
      next: (res) => this.registeredCustomers.set(res.items)
    });
  }

  onSelectCustomerFromDropdown(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const customerId = Number(select.value);
    if (!customerId) return;

    const customer = this.registeredCustomers().find(c => c.id === customerId);
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
    this.customerService.getCustomers({ search: taxId }).subscribe({
      next: (res) => {
        this.isSearchingCustomer.set(false);
        const match = res.items.find(c =>
          c.taxId && c.taxId.trim().toLowerCase() === taxId.toLowerCase()
        ) || res.items[0];

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

  addItem(): void {
    const itemGroup = this.fb.group({
      productId: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [this.taxRateDecimal()]
    });
    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
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
    if (this.form.invalid || this.anyStockExceeded()) return;

    const val = this.form.value;
    const name = val.customerName.trim();
    const taxId = val.customerTaxId?.trim();
    const email = val.customerEmail?.trim();

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

    const request: CreateSaleRequest = {
      customerName: name,
      customerTaxId: taxId || undefined,
      customerEmail: email || undefined,
      paymentMethod: val.paymentMethod as PaymentMethod,
      invoiceType: val.invoiceType as InvoiceType,
      saleDate: new Date(val.saleDate).toISOString(),
      notes: val.notes?.trim() || undefined,
      items: val.items.map((i: any) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        taxRate: this.taxRateDecimal()
      }))
    };

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

