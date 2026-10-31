import { Component, EventEmitter, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../core/services/product.service';
import { BranchContextService } from '../../../../core/services/branch-context.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductImportRow, BulkImportRequest, BulkImportResult } from '../../../../core/models/product.model';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-bulk-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFormatPipe],
  templateUrl: './bulk-import-modal.component.html'
})
export class BulkImportModalComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() imported = new EventEmitter<BulkImportResult>();

  private productService = inject(ProductService);
  private branchContextService = inject(BranchContextService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  readonly Math = Math;

  // Pasos del flujo: 'upload' -> 'preview' -> 'success'
  step = signal<'upload' | 'preview' | 'success'>('upload');

  // Pestaña activa en subida: 'excel' o 'image'
  activeTab = signal<'excel' | 'image'>('excel');

  // Estado de archivo y análisis
  selectedFile = signal<File | null>(null);
  previewImageUrl = signal<string | null>(null);
  isDragging = signal<boolean>(false);
  isAnalyzing = signal<boolean>(false);
  isCommitting = signal<boolean>(false);
  parsingError = signal<string | null>(null);

  // Filas parseadas para revisión
  rows = signal<ProductImportRow[]>([]);
  updateExisting = signal<boolean>(true);
  resultSummary = signal<BulkImportResult | null>(null);

  // Filtro de filas en tabla de previsualización
  filterStatus = signal<'all' | 'valid' | 'errors' | 'existing'>('all');

  // Métricas computadas
  totalRowsCount = computed(() => this.rows().length);

  validCount = computed(() =>
    this.rows().filter(r => r.isValid && !r.isExisting).length
  );

  existingCount = computed(() =>
    this.rows().filter(r => r.isExisting).length
  );

  errorCount = computed(() =>
    this.rows().filter(r => !r.isValid && !r.isExisting).length
  );

  filteredRows = computed(() => {
    const filter = this.filterStatus();
    const all = this.rows();
    if (filter === 'valid') return all.filter(r => r.isValid && !r.isExisting);
    if (filter === 'existing') return all.filter(r => r.isExisting);
    if (filter === 'errors') return all.filter(r => !r.isValid);
    return all;
  });

  canCommit = computed(() => {
    if (this.rows().length === 0) return false;
    const hasNewValid = this.validCount() > 0;
    const hasExistingValid = this.existingCount() > 0 && this.updateExisting();
    return hasNewValid || hasExistingValid;
  });

  // Métodos
  setTab(tab: 'excel' | 'image'): void {
    this.activeTab.set(tab);
    this.parsingError.set(null);
    this.selectedFile.set(null);
    this.previewImageUrl.set(null);
  }

  downloadTemplate(): void {
    this.productService.downloadImportTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantilla_inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notificationService.success('Plantilla descargada con éxito');
      },
      error: () => {
        this.notificationService.error('No se pudo descargar la plantilla Excel.');
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFileSelected(file);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0]);
    }
  }

  private handleFileSelected(file: File): void {
    this.parsingError.set(null);
    this.selectedFile.set(file);

    if (this.activeTab() === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => this.previewImageUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      this.previewImageUrl.set(null);
    }

    this.processFile(file);
  }

  processFile(file: File): void {
    this.isAnalyzing.set(true);
    this.parsingError.set(null);

    const isImage = this.activeTab() === 'image';
    const request$ = isImage
      ? this.productService.previewImageImport(file)
      : this.productService.previewExcelImport(file);

    request$.subscribe({
      next: (parsedRows) => {
        this.isAnalyzing.set(false);
        if (!parsedRows || parsedRows.length === 0) {
          this.parsingError.set('No se encontraron registros de productos válidos en el archivo.');
          return;
        }
        this.rows.set(parsedRows);
        this.step.set('preview');
        this.notificationService.info(`Se extrajeron ${parsedRows.length} productos para revisión.`);
      },
      error: (err) => {
        this.isAnalyzing.set(false);
        const detail = err.error?.detail || err.error?.title || err.message || 'Error al analizar el archivo.';
        this.parsingError.set(detail);
      }
    });
  }

  onRowFieldChange(row: ProductImportRow, field: keyof ProductImportRow, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    if (field === 'purchasePrice' || field === 'salePrice' || field === 'initialStock' || field === 'minimumStock') {
      (row as any)[field] = Number(value) || 0;
    } else {
      (row as any)[field] = value;
    }

    // Re-evaluar validez básica
    const errors: string[] = [];
    if (!row.sku?.trim()) errors.push('El SKU es obligatorio.');
    if (!row.name?.trim()) errors.push('El Nombre es obligatorio.');
    if (!row.categoryName?.trim()) errors.push('La Categoría es obligatoria.');
    if (row.purchasePrice < 0) errors.push('El precio de compra no puede ser negativo.');
    if (row.salePrice <= 0) errors.push('El precio de venta debe ser mayor a 0.');
    if (row.initialStock < 0) errors.push('El stock inicial no puede ser negativo.');

    if (row.isExisting) {
      errors.push('SKU ya existe en el catálogo.');
    }

    row.validationErrors = errors;
    row.isValid = errors.length === 0 || (row.isExisting && errors.length === 1);

    this.rows.update(current => [...current]);
  }

  removeRow(index: number): void {
    this.rows.update(current => {
      const next = [...current];
      next.splice(index, 1);
      return next;
    });
  }

  resetUpload(): void {
    this.step.set('upload');
    this.rows.set([]);
    this.selectedFile.set(null);
    this.previewImageUrl.set(null);
    this.parsingError.set(null);
    this.resultSummary.set(null);
  }

  commitImport(): void {
    if (!this.canCommit() || this.isCommitting()) return;

    this.isCommitting.set(true);

    const wid = this.branchContextService.selectedWarehouseId() ?? this.authService.currentUser()?.warehouseId ?? null;

    const request: BulkImportRequest = {
      warehouseId: wid,
      updateExisting: this.updateExisting(),
      products: this.rows()
    };

    this.productService.commitBulkImport(request).subscribe({
      next: (result) => {
        this.isCommitting.set(false);
        this.resultSummary.set(result);
        this.step.set('success');
        this.imported.emit(result);
        this.notificationService.success(`Importación completada: ${result.createdCount} creados, ${result.updatedCount} actualizados.`);
      },
      error: (err) => {
        this.isCommitting.set(false);
        const detail = err.error?.detail || err.error?.title || 'Ocurrió un error al guardar los productos en inventario.';
        this.notificationService.error(detail);
      }
    });
  }

  closeModal(): void {
    this.closed.emit();
  }
}
