import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WarehouseService } from '../../core/services/warehouse.service';
import { NotificationService } from '../../core/services/notification.service';
import { Warehouse, CreateClientAdminRequest } from '../../core/models/warehouse.model';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './warehouses.component.html'
})
export class WarehousesComponent implements OnInit {
  private warehouseService = inject(WarehouseService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  warehouses = signal<Warehouse[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = signal<string>('');
  isModalOpen = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  warehouseForm: FormGroup = this.fb.group({
    warehouseName: ['', [Validators.required, Validators.minLength(3)]],
    warehouseCode: ['', [Validators.required, Validators.minLength(2)]],
    adminFullName: ['', [Validators.required, Validators.minLength(3)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]],
    address: [''],
    city: [''],
    phone: ['']
  });

  filteredWarehouses = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.warehouses();
    if (!term) return list;
    return list.filter(w =>
      w.name.toLowerCase().includes(term) ||
      w.code.toLowerCase().includes(term) ||
      (w.adminUserName && w.adminUserName.toLowerCase().includes(term)) ||
      (w.adminUserEmail && w.adminUserEmail.toLowerCase().includes(term)) ||
      (w.city && w.city.toLowerCase().includes(term))
    );
  });

  totalWarehouses = computed(() => this.warehouses().length);
  activeWarehouses = computed(() => this.warehouses().filter(w => w.isActive).length);
  totalEmployees = computed(() => this.warehouses().reduce((sum, w) => sum + (w.employeeCount || 0), 0));

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.isLoading.set(true);
    this.warehouseService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notificationService.error(
          'Error al cargar almacenes',
          err?.error?.message || 'No fue posible obtener el listado de almacenes.'
        );
      }
    });
  }

  openCreateModal(): void {
    this.warehouseForm.reset({
      warehouseName: '',
      warehouseCode: '',
      adminFullName: '',
      adminEmail: '',
      adminPassword: '',
      address: '',
      city: '',
      phone: ''
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onSubmit(): void {
    if (this.warehouseForm.invalid) {
      this.warehouseForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const request: CreateClientAdminRequest = this.warehouseForm.value;

    this.warehouseService.createClientAdmin(request).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.notificationService.success(
          'Cliente Titular y Sede Creados',
          `El almacén '${created.name}' (${created.code}) y su administrador '${created.adminUserName}' fueron registrados exitosamente.`
        );
        this.loadWarehouses();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.notificationService.error(
          'Error al registrar',
          err?.error?.message || 'Ocurrió un error al procesar la solicitud de alta.'
        );
      }
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}
