import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../models/table-column.model';
import { TableStateManager } from '../../utils/table-state-manager';
import { CsvExportService } from '../../services/csv-export.service';
import { AppEmptyStateComponent } from '../app-empty-state/app-empty-state.component';
import { AppTableToolbarComponent } from '../app-table-toolbar/app-table-toolbar.component';
import { AppSortableHeaderComponent } from '../app-sortable-header/app-sortable-header.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    AppEmptyStateComponent,
    AppTableToolbarComponent,
    AppSortableHeaderComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-data-table.component.html'
})
export class AppDataTableComponent<T = any> {
  private csvExportService = inject(CsvExportService);

  columns = input<TableColumn<T>[]>([]);
  data = input<T[]>([]);
  loading = input<boolean>(false);
  emptyTitle = input<string>('No se encontraron registros');
  emptyDescription = input<string>('Intente ajustar los filtros o términos de búsqueda.');
  
  // Opciones de Toolbar y Exportación
  showToolbar = input<boolean>(true);
  showExportCsv = input<boolean>(true);
  exportFilename = input<string>('datos_tabla');
  searchPlaceholder = input<string>('Buscar en cualquier campo...');

  rowClick = output<T>();

  // Gestor reactivo de estado enlazado a la Signal data
  readonly tableState = new TableStateManager<T>({
    data: () => this.data()
  });

  onSearchChange(query: string): void {
    this.tableState.setSearch(query);
  }

  onSortChange(key: string): void {
    this.tableState.toggleSort(key);
  }

  onExportCsv(): void {
    const cols = this.columns().map((c) => ({
      key: c.key,
      header: c.header
    }));

    this.csvExportService.exportToCsv({
      filename: this.exportFilename(),
      columns: cols,
      data: this.tableState.processedItems()
    });
  }

  getVal(row: any, key: string): any {
    return this.tableState.resolveValue(row, key);
  }
}
