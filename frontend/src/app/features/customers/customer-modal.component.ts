import { Component, input, output, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../core/services/customer.service';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../../core/models/customer.model';

@Component({
  selector: 'app-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div class="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto animate-scale-up transition-all">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 class="text-base sm:text-lg font-bold text-slate-900">
                {{ customer() ? 'Editar Cliente Comercial' : 'Nuevo Cliente Comercial' }}
              </h2>
              <p class="text-xs text-slate-400">Directorio de contactos comerciales y facturación</p>
            </div>
            <button
              type="button"
              (click)="close()"
              class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          @if (errorMessage()) {
            <div class="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="save()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre / Razón Social *</label>
              <input
                type="text"
                [(ngModel)]="name"
                name="name"
                required
                placeholder="Ej. Distribuidora Andina S.A.S."
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">NIT / Documento</label>
                <input
                  type="text"
                  [(ngModel)]="taxId"
                  name="taxId"
                  placeholder="900.123.456-1"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  [(ngModel)]="phone"
                  name="phone"
                  placeholder="+57 300 123 4567"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  placeholder="compras@cliente.com"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  [(ngModel)]="city"
                  name="city"
                  placeholder="Bogotá D.C."
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Dirección Fiscal / Despacho</label>
              <input
                type="text"
                [(ngModel)]="address"
                name="address"
                placeholder="Cra 15 #93-60 Oficina 402"
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Notas Comerciales</label>
              <textarea
                [(ngModel)]="notes"
                name="notes"
                rows="2"
                placeholder="Condiciones de pago, contacto comercial alterno..."
                class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none resize-none"
              ></textarea>
            </div>

            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                (click)="close()"
                class="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="saving() || !name.trim()"
                class="px-5 py-2.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl cursor-pointer shadow-sm transition-all text-center"
              >
                {{ saving() ? 'Guardando...' : (customer() ? 'Actualizar Cliente' : 'Guardar Cliente') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class CustomerModalComponent {
  private customerService = inject(CustomerService);

  isOpen = input<boolean>(false);
  customer = input<Customer | null>(null);

  closed = output<void>();
  saved = output<Customer>();

  name = '';
  taxId = '';
  email = '';
  phone = '';
  address = '';
  city = '';
  notes = '';

  saving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const c = this.customer();
      if (c) {
        this.name = c.name;
        this.taxId = c.taxId || '';
        this.email = c.email || '';
        this.phone = c.phone || '';
        this.address = c.address || '';
        this.city = c.city || '';
        this.notes = c.notes || '';
      } else {
        this.resetForm();
      }
      this.errorMessage.set(null);
    });
  }

  save(): void {
    if (!this.name.trim()) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    const target = this.customer();
    if (target) {
      const req: UpdateCustomerRequest = {
        name: this.name.trim(),
        taxId: this.taxId.trim() || undefined,
        email: this.email.trim() || undefined,
        phone: this.phone.trim() || undefined,
        address: this.address.trim() || undefined,
        city: this.city.trim() || undefined,
        notes: this.notes.trim() || undefined
      };

      this.customerService.updateCustomer(target.id, req).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.saved.emit(res);
          this.close();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err.error?.message || 'Error al actualizar el cliente.');
        }
      });
    } else {
      const req: CreateCustomerRequest = {
        name: this.name.trim(),
        taxId: this.taxId.trim() || undefined,
        email: this.email.trim() || undefined,
        phone: this.phone.trim() || undefined,
        address: this.address.trim() || undefined,
        city: this.city.trim() || undefined,
        notes: this.notes.trim() || undefined
      };

      this.customerService.createCustomer(req).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.saved.emit(res);
          this.close();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err.error?.message || 'Error al crear el cliente.');
        }
      });
    }
  }

  close(): void {
    this.resetForm();
    this.closed.emit();
  }

  private resetForm(): void {
    this.name = '';
    this.taxId = '';
    this.email = '';
    this.phone = '';
    this.address = '';
    this.city = '';
    this.notes = '';
    this.errorMessage.set(null);
  }
}
