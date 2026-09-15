import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageChangeEvent } from '../../models/pagination.model';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-pagination.component.html'
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
