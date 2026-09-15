import { Component, input, output, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../core/services/customer.service';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../../core/models/customer.model';

@Component({
  selector: 'app-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-modal.component.html'
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
