import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supplier, CreateSupplierRequest } from '../../../../core/models/supplier.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-supplier-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div class="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto my-auto transition-all">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">
                {{ supplier ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
              </h3>
              <p class="text-xs text-slate-400">
                {{ supplier ? 'Modifica los datos del proveedor' : 'Registra un nuevo proveedor en la red de abastecimiento' }}
              </p>
            </div>
          </div>

          <button
            type="button"
            (click)="cancel.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Formulario -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Razón Social / Nombre -->
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Razón Social / Nombre <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Ej: Distribuciones Tech S.A.S."
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                [class.border-rose-400]="form.get('name')?.invalid && form.get('name')?.touched"
              />
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <p class="text-xs text-rose-500 mt-1">El nombre es obligatorio (máx. 150 caracteres).</p>
              }
            </div>

            <!-- TaxId -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Identificador Fiscal (RUT / RFC / NIT) <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                formControlName="taxId"
                placeholder="Ej: NIT-900123456-7"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all uppercase"
                [class.border-rose-400]="form.get('taxId')?.invalid && form.get('taxId')?.touched"
              />
              @if (form.get('taxId')?.invalid && form.get('taxId')?.touched) {
                <p class="text-xs text-rose-500 mt-1">El identificador fiscal es obligatorio.</p>
              }
            </div>

            <!-- Persona de Contacto -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Persona de Contacto
              </label>
              <input
                type="text"
                formControlName="contactName"
                placeholder="Ej: Juan Pérez"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                formControlName="email"
                placeholder="ventas@proveedor.com"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                [class.border-rose-400]="form.get('email')?.invalid && form.get('email')?.touched"
              />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <p class="text-xs text-rose-500 mt-1">Ingresa un correo electrónico válido.</p>
              }
            </div>

            <!-- Teléfono -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                formControlName="phone"
                placeholder="+57 300 1234567"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>

            <!-- Dirección -->
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Dirección Física
              </label>
              <input
                type="text"
                formControlName="address"
                placeholder="Calle 100 # 15-20, Bogotá"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
          </div>

          <!-- Error Alert -->
          @if (errorMessage()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Footer Buttons -->
          <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <app-button variant="outline" type="button" (clicked)="cancel.emit()">
              Cancelar
            </app-button>
            <app-button variant="primary" type="submit" [loading]="loading()">
              {{ supplier ? 'Guardar Cambios' : 'Crear Proveedor' }}
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class SupplierModalComponent implements OnInit {
  @Input() supplier: Supplier | null = null;
  @Input() loading = signal<boolean>(false);
  @Input() errorMessage = signal<string | null>(null);

  @Output() save = new EventEmitter<CreateSupplierRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.supplier?.name || '', [Validators.required, Validators.maxLength(150)]],
      taxId: [this.supplier?.taxId || '', [Validators.required, Validators.maxLength(30)]],
      contactName: [this.supplier?.contactName || '', [Validators.maxLength(100)]],
      email: [this.supplier?.email || '', [Validators.email, Validators.maxLength(150)]],
      phone: [this.supplier?.phone || '', [Validators.maxLength(30)]],
      address: [this.supplier?.address || '', [Validators.maxLength(300)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.value);
  }
}
