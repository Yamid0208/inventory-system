import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerService } from '../../core/services/customer.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { Customer, CustomerSummary, CustomerFilterParams } from '../../core/models/customer.model';
import { CustomerModalComponent } from './customer-modal.component';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { AppTableToolbarComponent } from '../../shared/components/app-table-toolbar/app-table-toolbar.component';
import { AppSortableHeaderComponent } from '../../shared/components/app-sortable-header/app-sortable-header.component';
import { TableStateManager } from '../../shared/utils/table-state-manager';
import { CsvExportService } from '../../shared/services/csv-export.service';
import { PageChangeEvent } from '../../shared/models/pagination.model';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    CustomerModalComponent,
    AppPaginationComponent,
    AppTableToolbarComponent,
    AppSortableHeaderComponent
  ],
  templateUrl: './customers.component.html'
})
export class CustomersComponent implements OnInit {
  private customerService = inject(CustomerService);
  private confirmationService = inject(ConfirmationService);
  private csvExportService = inject(CsvExportService);

  customers = signal<Customer[]>([]);
  summary = signal<CustomerSummary | null>(null);
  loading = signal<boolean>(false);

  // Gestor reactivo para ordenamiento y búsqueda omni-campo en clientes
  readonly tableState = new TableStateManager<Customer>({
    data: () => this.customers()
  });

  exportCustomersCsv(): void {
    const data = this.tableState.processedItems();
    if (!data.length) return;
    this.csvExportService.exportToCsv({
      filename: `clientes_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: 'name', header: 'Cliente / Razón Social' },
        { key: 'taxId', header: 'NIT / Cédula' },
        { key: 'email', header: 'Correo Electrónico' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'city', header: 'Ciudad' },
        { key: 'address', header: 'Dirección' },
        { key: 'isActive', header: 'Estado' }
      ],
      data
    });
  }

  totalCount = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);

  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');

  readonly statusOptions = [
    { id: 'all', label: 'Todos' },
    { id: 'active', label: 'Activos' },
    { id: 'inactive', label: 'Inactivos' }
  ] as const;

  isModalOpen = signal<boolean>(false);
  selectedCustomer = signal<Customer | null>(null);

  ngOnInit(): void {
    this.loadCustomers();
    this.loadSummary();
  }

  loadCustomers(): void {
    this.loading.set(true);

    let activeParam: boolean | undefined = undefined;
    if (this.statusFilter() === 'active') activeParam = true;
    if (this.statusFilter() === 'inactive') activeParam = false;

    const params: CustomerFilterParams = {
      search: this.searchQuery(),
      isActive: activeParam,
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize()
    };

    this.customerService.getCustomers(params).subscribe({
      next: (res) => {
        this.customers.set(res.items);
        this.totalCount.set(res.totalCount);
        this.pageNumber.set(res.pageNumber);
        this.pageSize.set(res.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadSummary(): void {
    this.customerService.getSummary().subscribe({
      next: (res) => this.summary.set(res)
    });
  }

  openCreateModal(): void {
    this.selectedCustomer.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(customer: Customer): void {
    this.selectedCustomer.set(customer);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedCustomer.set(null);
  }

  onCustomerSaved(): void {
    this.loadCustomers();
    this.loadSummary();
  }

  toggleStatus(customer: Customer): void {
    this.customerService.toggleStatus(customer.id).subscribe({
      next: () => {
        this.loadCustomers();
        this.loadSummary();
      }
    });
  }

  async deleteCustomer(customer: Customer): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: '¿Dar de Baja al Cliente?',
      message: `¿Está seguro de dar de baja al cliente '${customer.name}'? El cliente pasará a estado inactivo.`,
      confirmText: 'Sí, dar de baja',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
    if (!confirmed) return;

    this.customerService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.loadCustomers();
        this.loadSummary();
      }
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.pageNumber.set(1);
    this.loadCustomers();
  }

  setStatusFilter(filter: string): void {
    this.statusFilter.set(filter);
    this.pageNumber.set(1);
    this.loadCustomers();
  }

  onPageChange(event: PageChangeEvent): void {
    this.pageNumber.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.loadCustomers();
  }

  getInitials(name: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
}
