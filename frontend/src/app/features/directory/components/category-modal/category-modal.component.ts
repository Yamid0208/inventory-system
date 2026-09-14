import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CreateCategoryRequest } from '../../../../core/models/category.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">
                {{ category ? 'Editar Categoría' : 'Nueva Categoría' }}
              </h3>
              <p class="text-xs text-slate-400">
                {{ category ? 'Modifica los datos de la categoría' : 'Crea una nueva clasificación para tus productos' }}
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
          <!-- Nombre -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">
              Nombre de la Categoría <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              formControlName="name"
              placeholder="Ej: Electrónica, Mobiliario de Oficina..."
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              [class.border-rose-400]="form.get('name')?.invalid && form.get('name')?.touched"
            />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <p class="text-xs text-rose-500 mt-1">El nombre es obligatorio (máximo 100 caracteres).</p>
            }
          </div>

          <!-- Descripción -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">
              Descripción (Opcional)
            </label>
            <textarea
              formControlName="description"
              rows="3"
              placeholder="Describe el tipo de productos que pertenecerán a esta categoría..."
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
            ></textarea>
            <p class="text-[11px] text-slate-400 mt-1 text-right">Máx. 500 caracteres</p>
          </div>

          <!-- Error Alert si ocurre -->
          @if (errorMessage()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <!-- Footer Buttons -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <app-button variant="outline" type="button" (clicked)="cancel.emit()">
              Cancelar
            </app-button>
            <app-button variant="primary" type="submit" [loading]="loading()">
              {{ category ? 'Guardar Cambios' : 'Crear Categoría' }}
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class CategoryModalComponent implements OnInit {
  @Input() category: Category | null = null;
  @Input() loading = signal<boolean>(false);
  @Input() errorMessage = signal<string | null>(null);

  @Output() save = new EventEmitter<CreateCategoryRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.category?.name || '', [Validators.required, Validators.maxLength(100)]],
      description: [this.category?.description || '', [Validators.maxLength(500)]]
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
