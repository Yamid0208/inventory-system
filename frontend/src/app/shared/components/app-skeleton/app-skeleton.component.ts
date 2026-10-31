import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'table' | 'kpi-grid' | 'cards' | 'chart' | 'custom';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSkeletonComponent {
  type = input<SkeletonType>('table');
  rows = input<number>(5);
  columns = input<number>(5);
  count = input<number>(4);
  containerClass = input<string>('');

  get rowsArray(): number[] {
    return Array.from({ length: this.rows() }, (_, i) => i);
  }

  get columnsArray(): number[] {
    return Array.from({ length: this.columns() }, (_, i) => i);
  }

  get countArray(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}

