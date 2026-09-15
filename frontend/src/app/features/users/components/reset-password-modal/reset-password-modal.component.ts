import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetail, ResetUserPasswordRequest } from '../../../../core/models/user-admin.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-reset-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div class="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto transition-all">
        <!-- Encabezado -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900">Restablecer Contraseña</h2>
              <p class="text-xs text-slate-500">{{ user.fullName }} ({{ user.email }})</p>
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

        <div class="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-800 text-xs">
          <strong>Aviso de seguridad:</strong> Al restablecer la contraseña, todas las sesiones y tokens activos del usuario se revocarán inmediatamente.
        </div>

        <!-- Formulario -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nueva Contraseña *</label>
            <input
              type="password"
              formControlName="newPassword"
              placeholder="Mínimo 6 caracteres..."
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>

          <!-- Botones de Acción -->
          <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <app-button variant="outline" size="sm" type="button" (clicked)="onCancel()">
              Cancelar
            </app-button>
            <app-button
              variant="primary"
              size="sm"
              type="submit"
              [disabled]="form.invalid || isLoading()"
            >
              {{ isLoading() ? 'Actualizando...' : 'Restablecer Credencial' }}
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ResetPasswordModalComponent {
  @Input({ required: true }) user!: UserDetail;
  @Input() loading: any = false;

  @Output() save = new EventEmitter<{ id: number; request: ResetUserPasswordRequest }>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  isLoading(): boolean {
    return typeof this.loading === 'function' ? this.loading() : !!this.loading;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.save.emit({
      id: this.user.id,
      request: { newPassword: this.form.value.newPassword }
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
