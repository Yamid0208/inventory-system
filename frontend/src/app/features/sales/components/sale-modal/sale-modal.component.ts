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

@Component({
  selector: 'app-sale-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, CurrencyFormatPipe],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 my-8">
        <!-- Encabezado -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900">Registrar Venta / Salida Comercial</h2>
              <p class="text-xs text-slate-500">Facturación con consulta comercial de cliente (NIT/Cédula) y control de stock.</p>
            </div>
          </div>
          <button
            type="button"
            (click)="onCancel()"
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Alerta de Error -->
        @if (getErrorMessage()) {
          <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <svg class="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="font-medium">{{ getErrorMessage() }}</span>
          </div>
        }

        <!-- Formulario -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 text-xs">
          <!-- Sección de Datos del Cliente -->
          <div class="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span class="font-bold text-slate-800 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                Información del Cliente
              </span>

              @if (registeredCustomers().length > 0) {
                <div class="w-full sm:w-64">
                  <select
                    (change)="onSelectCustomerFromDropdown($event)"
                    class="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-primary-500 cursor-pointer"
                  >
                    <option value="">-- Seleccionar cliente registrado --</option>
                    @for (c of registeredCustomers(); track c.id) {
                      <option [value]="c.id">
                        {{ c.name }} {{ c.taxId ? '(' + c.taxId + ')' : '' }}
                      </option>
                    }
                  </select>
                </div>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <!-- N° Documento / NIT / Cédula con botón de consulta -->
              <div>
                <label class="block font-semibold text-slate-700 mb-1">N° Documento (NIT / C.C.)</label>
                <div class="relative flex items-center">
                  <input
                    type="text"
                    formControlName="customerTaxId"
                    (blur)="searchCustomerByTaxId()"
                    (keyup.enter)="searchCustomerByTaxId()"
                    placeholder="Ej. 900.123.456-7"
                    class="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    (click)="searchCustomerByTaxId()"
                    class="absolute right-2 text-slate-400 hover:text-primary-600 p-1 cursor-pointer"
                    title="Consultar cliente en base de datos"
                  >
                    @if (isSearchingCustomer()) {
                      <svg class="w-4 h-4 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    } @else {
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <!-- Nombre o Razón Social -->
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Cliente / Razón Social *</label>
                <input
                  type="text"
                  formControlName="customerName"
                  placeholder="Nombre completo o empresa..."
                  class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>

              <!-- Correo Electrónico -->
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  formControlName="customerEmail"
                  placeholder="cliente@empresa.com"
                  class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>

            <!-- Estado de Verificación de Registro de Cliente -->
            @if (customerSearchStatus() === 'found') {
              <div class="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div class="flex items-center gap-2 font-medium">
                  <span class="text-emerald-600 font-bold">✓</span>
                  <span>Cliente registrado en el directorio: <strong>{{ foundCustomerName() }}</strong></span>
                </div>
                <span class="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Verificado</span>
              </div>
            } @else if (customerSearchStatus() === 'not_found') {
              <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div class="flex items-center gap-2 font-medium">
                    <span class="text-amber-600">ℹ️</span>
                    <span>El cliente con documento <strong>{{ form.get('customerTaxId')?.value }}</strong> no figura en el directorio.</span>
                  </div>
                  <button
                    type="button"
                    (click)="registerCustomerNow()"
                    [disabled]="isRegisteringCustomer() || !form.get('customerName')?.value?.trim()"
                    class="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {{ isRegisteringCustomer() ? 'Registrando...' : '+ Registrar Cliente Ahora' }}
                  </button>
                </div>
                <div class="pt-1.5 border-t border-amber-200/80">
                  <label class="flex items-center gap-2 text-slate-800 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      [checked]="autoRegisterCustomer()"
                      (change)="autoRegisterCustomer.set($any($event.target).checked)"
                      class="rounded border-amber-400 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                    />
                    <span>Registrar automáticamente en el directorio comercial al completar la venta</span>
                  </label>
                </div>
              </div>
            }
          </div>

          <!-- Datos de Facturación y Pago -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Método de Pago *</label>
              <select
                formControlName="paymentMethod"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
              >
                <option value="Cash">Efectivo</option>
                <option value="CreditCard">Tarjeta de Débito / Crédito</option>
                <option value="Transfer">Transferencia Bancaria</option>
                <option value="Credit">Crédito Comercial (30 días)</option>
              </select>
            </div>
            
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Tipo de Factura *</label>
              <select
                formControlName="invoiceType"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
              >
                <option value="Traditional">Tradicional</option>
                <option value="Electronic">Electrónica</option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Fecha de Facturación *</label>
              <input
                type="date"
                formControlName="saleDate"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
          </div>

          <!-- Líneas de Detalle de Venta -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-slate-800">Productos a Facturar</h3>
              <button
                type="button"
                (click)="addItem()"
                class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Agregar Producto</span>
              </button>
            </div>

            <div formArrayName="items" class="space-y-2 max-h-60 overflow-y-auto pr-1">
              @for (item of itemsArray.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
                  <!-- Selector de Producto -->
                  <div class="flex-1 w-full">
                    <label class="block text-[10px] text-slate-400 font-medium mb-0.5">Producto / SKU</label>
                    <select
                      formControlName="productId"
                      (change)="onProductSelect(i)"
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-primary-500 cursor-pointer"
                    >
                      <option [value]="null">Seleccionar producto...</option>
                      @for (p of products; track p.id) {
                        <option [value]="p.id">
                          [{{ p.sku }}] {{ p.name }} (Stock: {{ p.currentStock }})
                        </option>
                      }
                    </select>
                  </div>

                  <!-- Cantidad -->
                  <div class="w-full sm:w-24">
                    <label class="block text-[10px] text-slate-400 font-medium mb-0.5">Cantidad</label>
                    <input
                      type="number"
                      formControlName="quantity"
                      min="1"
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono text-center focus:outline-none focus:border-primary-500"
                      [class.border-rose-500]="isLineStockExceeded(i)"
                    />
                  </div>

                  <!-- Precio Unitario de Venta -->
                  <div class="w-full sm:w-28">
                    <label class="block text-[10px] text-slate-400 font-medium mb-0.5">Precio Venta</label>
                    <input
                      type="number"
                      step="0.01"
                      formControlName="unitPrice"
                      min="0"
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono text-right focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <!-- Total Línea -->
                  <div class="w-full sm:w-28 text-right">
                    <label class="block text-[10px] text-slate-400 font-medium mb-0.5">Total</label>
                    <div class="py-1.5 font-mono font-bold text-slate-800">
                      {{ getLineTotal(i) | currencyFormat }}
                    </div>
                  </div>

                  <!-- Eliminar -->
                  <button
                    type="button"
                    (click)="removeItem(i)"
                    [disabled]="itemsArray.length === 1"
                    class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                    title="Eliminar fila"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>

                <!-- Advertencia RN-001 si excede stock -->
                @if (isLineStockExceeded(i)) {
                  <div class="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold text-[11px] flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>La cantidad supera las existencias físicas disponibles ({{ getSelectedProduct(i)?.currentStock }} uds). La regla RN-001 prohíbe stock negativo.</span>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Resumen de Totales Financieros -->
          <div class="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <span class="text-xs text-slate-400">
              Descuento automático de stock en tiempo real e incorporación a Kardex.
            </span>
            <div class="flex items-center gap-6 text-right font-mono text-xs">
              <div>
                <span class="block text-[10px] text-slate-400">Subtotal</span>
                <span>{{ calculatedSubtotal() | currencyFormat }}</span>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400">IVA (19%)</span>
                <span>{{ calculatedTax() | currencyFormat }}</span>
              </div>
              <div>
                <span class="block text-[10px] text-emerald-400 font-bold">Total Venta</span>
                <span class="text-base font-extrabold text-white">{{ calculatedTotal() | currencyFormat }}</span>
              </div>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <app-button variant="outline" size="sm" type="button" (clicked)="onCancel()">
              Cancelar
            </app-button>
            <app-button
              variant="primary"
              size="sm"
              type="submit"
              [disabled]="form.invalid || itemsArray.length === 0 || anyStockExceeded() || isLoading() || isRegisteringCustomer()"
            >
              {{ isLoading() ? 'Procesando Venta...' : 'Completar Venta y Descontar Stock' }}
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `
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

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService
  ) { }

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

    // 1. Consulta en la lista cargada localmente
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

    // 2. Consulta al backend vía API
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
      taxRate: [0.19]
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
    return subtotal * 1.19;
  }

  calculatedSubtotal(): number {
    return this.itemsArray.controls.reduce((acc, curr) => {
      const qty = Number(curr.get('quantity')?.value) || 0;
      const price = Number(curr.get('unitPrice')?.value) || 0;
      return acc + (qty * price);
    }, 0);
  }

  calculatedTax(): number {
    return this.calculatedSubtotal() * 0.19;
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

    // Auto-registro en directorio de clientes si no está registrado y la casilla está habilitada
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
        taxRate: 0.19
      }))
    };

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
