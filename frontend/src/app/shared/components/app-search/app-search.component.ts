import { Component, ChangeDetectionStrategy, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>

      <input
        type="text"
        [value]="query"
        (input)="onInput($event)"
        [placeholder]="placeholder()"
        class="w-full pl-9 pr-8 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-inner"
        [attr.aria-label]="placeholder()" />

      @if (query) {
        <button
          type="button"
          (click)="clear()"
          class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white transition-colors"
          aria-label="Limpiar búsqueda">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      }
    </div>
  `
})
export class AppSearchComponent implements OnInit, OnDestroy {
  placeholder = input<string>('Buscar...');
  debounceMs = input<number>(400);

  search = output<string>();

  query = '';
  private searchSubject = new Subject<string>();
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.searchSubject
      .pipe(
        debounceTime(this.debounceMs()),
        distinctUntilChanged()
      )
      .subscribe((val) => this.search.emit(val));
  }

  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.query = inputElement.value;
    this.searchSubject.next(this.query);
  }

  clear(): void {
    this.query = '';
    this.searchSubject.next('');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
