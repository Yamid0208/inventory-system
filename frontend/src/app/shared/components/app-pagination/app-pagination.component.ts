import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageChangeEvent } from '../../models/pagination.model';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-xs text-slate-400 select-none border-t border-slate-700/60" aria-label="Paginación">
      <div class="flex items-center space-x-2">
        <span>Filas por página:</span>
        <select
          [value]="pageSize()"
          (change)="onPageSizeChange($event)"
          class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500">
          @for (option of pageSizeOptions(); track option) {
            <option [value]="option">{{ option }}</option>
          }
        </select>
        <span class="text-slate-400">
          Mostrando <strong class="text-slate-200">{{ startItem() }}</strong> - <strong class="text-slate-200">{{ endItem() }}</strong> de <strong class="text-slate-200">{{ totalCount() }}</strong>
        </span>
      </div>

      <div class="flex items-center space-x-1">
        <button
          type="button"
          [disabled]="!hasPreviousPage()"
          (click)="goToPage(pageNumber() - 1)"
          class="px-2.5 py-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior">
          Anterior
        </button>

        <span class="px-3 py-1 font-semibold text-slate-200">
          Página {{ pageNumber() }} de {{ totalPages() }}
        </span>

        <button
          type="button"
          [disabled]="!hasNextPage()"
          (click)="goToPage(pageNumber() + 1)"
          class="px-2.5 py-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente">
          Siguiente
        </button>
      </div>
    </nav>
  `
})
export class AppPaginationComponent {
  pageNumber = input<number>(1);
  pageSize = input<number>(10);
  totalCount = input<number>(0);
  pageSizeOptions = input<number[]>([10, 25, 50]);

  pageChange = output<PageChangeEvent>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / (this.pageSize() || 1))));
  hasPreviousPage = computed(() => this.pageNumber() > 1);
  hasNextPage = computed(() => this.pageNumber() < this.totalPages());

  startItem = computed(() => {
    if (this.totalCount() === 0) return 0;
    return (this.pageNumber() - 1) * this.pageSize() + 1;
  });

  endItem = computed(() => {
    return Math.min(this.pageNumber() * this.pageSize(), this.totalCount());
  });

  goToPage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages() && newPage !== this.pageNumber()) {
      this.pageChange.emit({ pageNumber: newPage, pageSize: this.pageSize() });
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    this.pageChange.emit({ pageNumber: 1, pageSize: newSize });
  }
}
