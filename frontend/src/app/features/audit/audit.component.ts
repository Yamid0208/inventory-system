import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../core/services/audit.service';
import { AuditLog, AuditSummary, AuditLogFilterParams } from '../../core/models/audit.model';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { AppAutocompleteComponent } from '../../shared/components/app-autocomplete/app-autocomplete.component';
import { PageChangeEvent } from '../../shared/models/pagination.model';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, AppPaginationComponent, AppAutocompleteComponent],
  templateUrl: './audit.component.html'
})
export class AuditComponent implements OnInit {
  private auditService = inject(AuditService);

  logs = signal<AuditLog[]>([]);
  summary = signal<AuditSummary | null>(null);
  loading = signal<boolean>(false);

  totalCount = signal<number>(0);
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);

  entityFilter = signal<string>('all');
  actionFilter = signal<string>('all');
  searchQuery = signal<string>('');

  readonly entities = [
    { value: 'all', label: 'Todas las Entidades' },
    { value: 'Auth', label: 'Autenticación' },
    { value: 'User', label: 'Usuarios' },
    { value: 'Product', label: 'Productos' },
    { value: 'Inventory', label: 'Kardex' },
    { value: 'Purchase', label: 'Compras' },
    { value: 'Sale', label: 'Ventas' }
  ];

  readonly actions = [
    { value: 'all', label: 'Todas las Acciones' },
    { value: 'Login', label: 'Inicios de Sesión' },
    { value: 'Create', label: 'Creaciones' },
    { value: 'Update', label: 'Modificaciones' },
    { value: 'Delete', label: 'Bajas Lógicas' },
    { value: 'Receive', label: 'Recepción Almacén' },
    { value: 'Cancel', label: 'Cancelaciones' },
    { value: 'PasswordReset', label: 'Reinicio Claves' }
  ];

  ngOnInit(): void {
    this.loadLogs();
    this.loadSummary();
  }

  loadLogs(): void {
    this.loading.set(true);

    const params: AuditLogFilterParams = {
      entityName: this.entityFilter(),
      action: this.actionFilter(),
      search: this.searchQuery(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize()
    };

    this.auditService.getLogs(params).subscribe({
      next: (res) => {
        this.logs.set(res.items);
        this.totalCount.set(res.totalCount);
        this.pageNumber.set(res.pageNumber);
        this.pageSize.set(res.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadSummary(): void {
    this.auditService.getSummary().subscribe({
      next: (sum) => this.summary.set(sum)
    });
  }

  setEntityFilter(entity: string): void {
    this.entityFilter.set(entity);
    this.pageNumber.set(1);
    this.loadLogs();
  }

  setActionFilter(action: string): void {
    this.actionFilter.set(action);
    this.pageNumber.set(1);
    this.loadLogs();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.pageNumber.set(1);
    this.loadLogs();
  }

  onPaginationChange(event: PageChangeEvent): void {
    this.pageNumber.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.loadLogs();
  }

  getInitials(name: string): string {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  getActionBadge(action: string): { label: string; class: string } {
    switch (action) {
      case 'Create':
        return { label: 'Creación', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Update':
        return { label: 'Modificación', class: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'Delete':
      case 'Cancel':
        return { label: action === 'Delete' ? 'Baja' : 'Anulación', class: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'Receive':
        return { label: 'Recepción', class: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'Login':
        return { label: 'Acceso Login', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'PasswordReset':
        return { label: 'Reset Clave', class: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: action, class: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }

  getEntityBadge(entity: string): { label: string; class: string } {
    switch (entity) {
      case 'Auth':
        return { label: 'Seguridad / Auth', class: 'text-indigo-600 font-semibold' };
      case 'User':
        return { label: 'Cuenta Usuario', class: 'text-purple-600 font-semibold' };
      case 'Product':
        return { label: 'Catálogo Producto', class: 'text-blue-600 font-semibold' };
      case 'Purchase':
        return { label: 'Orden de Compra', class: 'text-amber-600 font-semibold' };
      case 'Sale':
        return { label: 'Factura Venta', class: 'text-emerald-600 font-semibold' };
      case 'Inventory':
        return { label: 'Ajuste Kardex', class: 'text-rose-600 font-semibold' };
      default:
        return { label: entity, class: 'text-slate-600 font-semibold' };
    }
  }
}
