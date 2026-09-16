import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetail } from '../../../../core/models/user-admin.model';
import { Warehouse } from '../../../../core/models/warehouse.model';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AppAutocompleteComponent, AutocompleteOption } from '../../../../shared/components/app-autocomplete/app-autocomplete.component';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import { appEmailValidator } from '../../../../shared/validators';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, AppAutocompleteComponent],
  templateUrl: './user-modal.component.html'
})
export class UserModalComponent implements OnInit {
  authService = inject(AuthService);
  private warehouseService = inject(WarehouseService);
  private branchContextService = inject(BranchContextService);
  private fb = inject(FormBuilder);

  @Input() user: UserDetail | null = null;
  @Input() loading: any = false;
  @Input() errorMessage: any = null;

  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  warehouses = signal<Warehouse[]>([]);

  get isClientAdmin(): boolean {
    return this.authService.currentUser()?.role === 'Admin';
  }

  get roleOptions(): AutocompleteOption[] {
    const options: AutocompleteOption[] = [];
    if (!this.isClientAdmin) {
      options.push(
        { value: 'SuperAdmin', label: 'Super Administrador (Control total multi-almacén)' },
        { value: 'Admin', label: 'Administrador Titular de Almacén' }
      );
    }
    options.push(
      { value: 'Warehouse', label: 'Bodega / Almacén (Gestión de stock, compras y Kardex)' },
      { value: 'Seller', label: 'Vendedor / Comercial (Facturación y clientes)' }
    );
    return options;
  }

  get warehouseOptions(): AutocompleteOption[] {
    const options: AutocompleteOption[] = [];
    if (!this.isClientAdmin) {
      options.push({ value: null, label: '-- Sin Almacén Específico (Global) --' });
    }
    return options.concat(this.warehouses().map(w => ({
      value: w.id,
      label: `${w.name} (${w.code})`,
      sublabel: w.city || w.address || undefined
    })));
  }

  ngOnInit(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses.set(data);
        if (this.isClientAdmin && !this.user && data.length > 0 && !this.form.get('warehouseId')?.value) {
          const currentWhId = this.branchContextService.selectedWarehouseId() ?? this.authService.currentUser()?.warehouseId;
          const match = data.find(w => w.id === currentWhId);
          this.form.patchValue({ warehouseId: match ? match.id : data[0].id });
        }
      },
      error: () => {}
    });

    const defaultRole = this.user?.role || (this.isClientAdmin ? 'Warehouse' : 'Seller');
    const defaultWarehouseId = this.user?.warehouseId ?? (this.branchContextService.selectedWarehouseId() ?? this.authService.currentUser()?.warehouseId ?? null);

    this.form = this.fb.group({
      fullName: [this.user?.fullName || '', [Validators.required, Validators.maxLength(150)]],
      email: [this.user?.email || '', [Validators.required, appEmailValidator(true), Validators.maxLength(150)]],
      role: [defaultRole, [Validators.required]],
      warehouseId: [defaultWarehouseId, this.isClientAdmin ? [Validators.required] : []],
      password: ['', this.user ? [] : [Validators.required, Validators.minLength(6)]]
    });
  }

  isLoading(): boolean {
    return typeof this.loading === 'function' ? this.loading() : !!this.loading;
  }

  getErrorMessage(): string | null {
    return typeof this.errorMessage === 'function' ? this.errorMessage() : (this.errorMessage || null);
  }

  onSubmit(): void {
    if (this.form.valid) {
      const formValue = { ...this.form.value };
      if (formValue.warehouseId !== null && formValue.warehouseId !== undefined && formValue.warehouseId !== '') {
        formValue.warehouseId = Number(formValue.warehouseId);
      } else {
        formValue.warehouseId = null;
      }
      if (this.user) {
        this.save.emit({ id: this.user.id, request: formValue });
      } else {
        this.save.emit(formValue);
      }
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

