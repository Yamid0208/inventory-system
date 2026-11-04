import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SortDirection } from '../../utils/table-state-manager';

@Component({
  selector: 'app-sortable-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-sortable-header.component.html'
})
export class AppSortableHeaderComponent {
  key = input<string>('');
  label = input<string>('');
  sortKey = input<string | null>(null);
  sortDirection = input<SortDirection>(null);
  align = input<'left' | 'center' | 'right'>('left');

  sortChange = output<string>();

  isActive = computed(() => !!this.key() && this.sortKey() === this.key());
  isAsc = computed(() => this.isActive() && this.sortDirection() === 'asc');
  isDesc = computed(() => this.isActive() && this.sortDirection() === 'desc');

  ariaSort = computed<'ascending' | 'descending' | 'none'>(() => {
    if (!this.isActive()) return 'none';
    if (this.sortDirection() === 'asc') return 'ascending';
    if (this.sortDirection() === 'desc') return 'descending';
    return 'none';
  });

  onToggle(): void {
    if (this.key()) {
      this.sortChange.emit(this.key());
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggle();
    }
  }
}
