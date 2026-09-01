import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn } from '../../models/table-column.model';
import { AppEmptyStateComponent } from '../app-empty-state/app-empty-state.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, AppEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full overflow-x-auto rounded-lg border border-slate-700/80 bg-slate-900/60 shadow-md">
      <table class="w-full text-left border-collapse text-sm">
        <thead class="bg-slate-800/90 text-slate-300 uppercase text-xs tracking-wider border-b border-slate-700">
          <tr>
            @for (col of columns(); track col.key) {
              <th
                scope="col"
                [class]="'px-4 py-3 font-semibold ' + (col.align ? 'text-' + col.align : 'text-left')"
                [style.width]="col.width || 'auto'">
                {{ col.header }}
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 text-slate-200">
          @if (loading()) {
            @for (placeholder of [1, 2, 3, 4, 5]; track placeholder) {
              <tr class="animate-pulse">
                @for (col of columns(); track col.key) {
                  <td class="px-4 py-3">
                    <div class="h-4 bg-slate-700/60 rounded w-3/4"></div>
                  </td>
                }
              </tr>
            }
          } @else if (data().length === 0) {
            <tr>
              <td [attr.colspan]="columns().length" class="p-0">
                <app-empty-state
                  [title]="emptyTitle()"
                  [description]="emptyDescription()">
                </app-empty-state>
              </td>
            </tr>
          } @else {
            @for (row of data(); track $index) {
              <tr
                (click)="rowClick.emit(row)"
                class="hover:bg-slate-800/50 transition-colors cursor-pointer">
                @for (col of columns(); track col.key) {
                  <td [class]="'px-4 py-3 ' + (col.align ? 'text-' + col.align : 'text-left')">
                    @if (col.cellTemplate) {
                      <ng-container
                        *ngTemplateOutlet="col.cellTemplate; context: { $implicit: row, value: getVal(row, col.key) }">
                      </ng-container>
                    } @else {
                      {{ getVal(row, col.key) }}
                    }
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `
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
