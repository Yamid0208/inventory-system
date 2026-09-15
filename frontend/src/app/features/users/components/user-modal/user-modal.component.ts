import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetail } from '../../../../core/models/user-admin.model';
import { Warehouse } from '../../../../core/models/warehouse.model';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  templateUrl: './user-modal.component.html'
})
export class UserModalComponent implements OnInit {
  authService = inject(AuthService);
  private warehouseService = inject(WarehouseService);
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

  ngOnInit(): void {
    if (!this.isClientAdmin) {
      this.warehouseService.getWarehouses().subscribe({
        next: (data) => this.warehouses.set(data),
        error: () => {}
      });
    }

    const defaultRole = this.user?.role || (this.isClientAdmin ? 'Warehouse' : 'Seller');
    const defaultWarehouseId = this.user?.warehouseId ?? (this.isClientAdmin ? (this.authService.currentUser()?.warehouseId ?? null) : null);

    this.form = this.fb.group({
      fullName: [this.user?.fullName || '', [Validators.required, Validators.maxLength(150)]],
      email: [this.user?.email || '', [Validators.required, Validators.email, Validators.maxLength(150)]],
      role: [defaultRole, [Validators.required]],
      warehouseId: [defaultWarehouseId],
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
      if (this.isClientAdmin) {
        formValue.warehouseId = this.authService.currentUser()?.warehouseId ?? null;
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

