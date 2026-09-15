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
  templateUrl: './app-search.component.html'
})
export class AppSearchComponent implements OnInit, OnDestroy {
  placeholder = input<string>('Buscar...');
  debounceMs = input<number>(350);

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
    this.search.emit('');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
