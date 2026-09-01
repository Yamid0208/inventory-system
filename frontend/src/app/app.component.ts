import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AppButtonComponent,
  AppBadgeComponent,
  AppCardComponent,
  AppSearchComponent,
  AppPaginationComponent,
  AppDataTableComponent,
  AppEmptyStateComponent,
  AppErrorStateComponent,
  AppConfirmDialogComponent,
  AppLoadingComponent
} from './shared/components';
import { CurrencyFormatPipe, DateFormatPipe } from './shared/pipes';
import { TableColumn } from './shared/models';

interface ApiHealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

interface DemoProduct {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'InStock' | 'LowStock' | 'OutOfStock';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    AppButtonComponent,
    AppBadgeComponent,
    AppCardComponent,
    AppSearchComponent,
    AppPaginationComponent,
    AppDataTableComponent,
    AppEmptyStateComponent,
    AppErrorStateComponent,
    AppConfirmDialogComponent,
    AppLoadingComponent,
    CurrencyFormatPipe,
    DateFormatPipe
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);

  // Estados de salud
  apiStatus = signal<string>('Comprobando...');
  serviceName = signal<string>('-');
  serviceVersion = signal<string>('-');
  timestamp = signal<string>('-');
  isHealthy = signal<boolean>(false);

  // Estados interactivos para showcase del Design System
  buttonLoading = signal<boolean>(false);
  tableLoading = signal<boolean>(false);
  dialogOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(5);

  // Columnas para AppDataTable
  columns: TableColumn<DemoProduct>[] = [
    { key: 'sku', header: 'SKU', width: '120px' },
    { key: 'name', header: 'Producto' },
    { key: 'category', header: 'Categoría' },
    { key: 'price', header: 'Precio', align: 'right' },
    { key: 'stock', header: 'Stock', align: 'center', width: '90px' },
    { key: 'status', header: 'Estado', align: 'center', width: '130px' }
  ];

  // Datos mock para demostración
  mockProducts: DemoProduct[] = [
    { id: 1, sku: 'LAP-001', name: 'Dell XPS 15 OLED', category: 'Laptops', price: 1899.99, stock: 12, status: 'InStock' },
    { id: 2, sku: 'MNT-002', name: 'Monitor LG UltraWide 34"', category: 'Monitores', price: 649.50, stock: 4, status: 'LowStock' },
    { id: 3, sku: 'KEY-003', name: 'Teclado Mecánico Keychron Q1', category: 'Periféricos', price: 179.00, stock: 0, status: 'OutOfStock' },
    { id: 4, sku: 'MOU-004', name: 'Mouse Logitech MX Master 3S', category: 'Periféricos', price: 99.99, stock: 25, status: 'InStock' },
    { id: 5, sku: 'AUD-005', name: 'Audífonos Sony WH-1000XM5', category: 'Audio', price: 349.99, stock: 3, status: 'LowStock' }
  ];

  displayedProducts = signal<DemoProduct[]>(this.mockProducts);

  ngOnInit(): void {
    this.checkApiHealth();
  }

  checkApiHealth(): void {
    this.http.get<ApiHealthResponse>('/api/v1/health').subscribe({
      next: (res) => {
        this.apiStatus.set(res.status);
        this.serviceName.set(res.service);
        this.serviceVersion.set(res.version);
        this.timestamp.set(new Date(res.timestamp).toLocaleString());
        this.isHealthy.set(res.status === 'Healthy');
      },
      error: () => {
        this.apiStatus.set('Error de Conexión');
        this.isHealthy.set(false);
      }
    });
  }

  toggleButtonLoading(): void {
    this.buttonLoading.set(true);
    setTimeout(() => {
      this.buttonLoading.set(false);
    }, 2000);
  }

  toggleTableLoading(): void {
    this.tableLoading.set(true);
    setTimeout(() => {
      this.tableLoading.set(false);
    }, 1500);
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    const filtered = this.mockProducts.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    );
    this.displayedProducts.set(filtered);
  }

  onPageChange(event: { pageNumber: number; pageSize: number }): void {
    this.currentPage.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
  }

  openConfirmDialog(): void {
    this.dialogOpen.set(true);
  }

  closeConfirmDialog(): void {
    this.dialogOpen.set(false);
  }

  handleConfirm(): void {
    this.dialogOpen.set(false);
  }
}
