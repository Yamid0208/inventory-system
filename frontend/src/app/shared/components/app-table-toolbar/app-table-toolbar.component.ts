import { Component, ChangeDetectionStrategy, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-table-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-table-toolbar.component.html'
})
export class AppTableToolbarComponent implements OnInit, OnDestroy {
  searchPlaceholder = input<string>('Buscar en cualquier campo...');
  searchValue = input<string>('');
  totalCount = input<number>(0);
  filteredCount = input<number>(0);
  isFiltered = input<boolean>(false);
  showExportCsv = input<boolean>(true);
  exportDisabled = input<boolean>(false);
  exportLabel = input<string>('Exportar CSV');
  debounceMs = input<number>(250);

  searchChange = output<string>();
  exportCsv = output<void>();

  query = '';
  private searchSubject = new Subject<string>();
  private sub?: Subscription;

  ngOnInit(): void {
    this.query = this.searchValue() || '';
    this.sub = this.searchSubject
      .pipe(
        debounceTime(this.debounceMs()),
        distinctUntilChanged()
      )
      .subscribe((val) => this.searchChange.emit(val));
  }

  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.query = inputElement.value;
    this.searchSubject.next(this.query);
  }

  clearSearch(): void {
    this.query = '';
    this.searchSubject.next('');
    this.searchChange.emit('');
  }

  onExport(): void {
    if (!this.exportDisabled()) {
      this.exportCsv.emit();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
