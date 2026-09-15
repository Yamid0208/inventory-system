import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../models/table-column.model';
import { AppEmptyStateComponent } from '../app-empty-state/app-empty-state.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, AppEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-data-table.component.html'
})
export class AppDataTableComponent<T = any> {
  columns = input<TableColumn<T>[]>([]);
  data = input<T[]>([]);
  loading = input<boolean>(false);
  emptyTitle = input<string>('No se encontraron registros');
  emptyDescription = input<string>('Intente ajustar los filtros o términos de búsqueda.');

  rowClick = output<T>();

  getVal(row: any, key: string): any {
    if (!row || !key) return '';
    return row[key] ?? '';
  }
}
