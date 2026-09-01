import { TemplateRef } from '@angular/core';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  cellTemplate?: TemplateRef<any>;
}
