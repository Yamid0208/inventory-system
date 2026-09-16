import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  signal,
  computed,
  ElementRef,
  HostListener,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface AutocompleteOption {
  value: any;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppAutocompleteComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-autocomplete.component.html'
})
export class AppAutocompleteComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() name = '';
  @Input() placeholder = 'Escriba para buscar o seleccione...';
  @Input() disabled = false;
  @Input() hasError = false;
  @Input() allowClear = true;
  @Input() label?: string;
  @Input() required = false;

  @Input() set options(val: AutocompleteOption[] | null | undefined) {
    const list = val || [];
    this._optionsSignal.set(list);
    const curVal = this.selectedValue();
    if (curVal !== null && curVal !== undefined && curVal !== '') {
      const matched = list.find(opt => String(opt.value) === String(curVal));
      if (matched && !this.isOpen()) {
        this.searchQuery.set(matched.label);
      }
    }
  }

  @Input() set value(val: any) {
    this.writeValue(val);
  }

  @Output() valueChange = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any>();
  @Output() cleared = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  private _optionsSignal = signal<AutocompleteOption[]>([]);
  readonly optionsSignal = this._optionsSignal.asReadonly();

  isOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  highlightedIndex = signal<number>(-1);
  selectedValue = signal<any>(null);

  // Texto amigable mostrado
  selectedOption = computed(() => {
    const val = this.selectedValue();
    if (val === null || val === undefined || val === '') return null;
    return this.optionsSignal().find(opt => String(opt.value) === String(val)) || null;
  });

  // Opciones filtradas en tiempo real sin distinción de acentos ni mayúsculas
  filteredOptions = computed(() => {
    const query = this.normalize(this.searchQuery().trim());
    const all = this.optionsSignal();
    if (!query) {
      return all.slice(0, 80);
    }
    const selected = this.selectedOption();
    if (selected && this.normalize(selected.label) === query) {
      return all.slice(0, 80);
    }
    return all.filter(opt => {
      const lbl = this.normalize(opt.label);
      const sub = opt.sublabel ? this.normalize(opt.sublabel) : '';
      return lbl.includes(query) || sub.includes(query);
    }).slice(0, 80);
  });

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  constructor(private elRef: ElementRef) {}

  writeValue(value: any): void {
    this.selectedValue.set(value);
    const matched = this.optionsSignal().find(opt => String(opt.value) === String(value));
    if (matched) {
      this.searchQuery.set(matched.label);
    } else if (value === null || value === undefined || value === '') {
      this.searchQuery.set('');
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown(): void {
    if (this.disabled) return;
    this.isOpen.set(true);
    this.highlightedIndex.set(-1);

    // Si ya hay opción seleccionada, enfocar y seleccionar todo el texto para fácil edición
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
        this.searchInput.nativeElement.select();
      }
    });
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
    this.onTouched();

    // Si se cierra sin seleccionar o se borró el texto, restaurar o limpiar
    const selected = this.selectedOption();
    if (selected) {
      this.searchQuery.set(selected.label);
    } else if (!this.selectedValue()) {
      this.searchQuery.set('');
    }
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    if (!this.isOpen()) {
      this.isOpen.set(true);
    }
    this.highlightedIndex.set(0);

    // Si borró completamente el input
    if (val === '' && this.selectedValue() !== null) {
      this.clearSelection(event);
    }
  }

  selectOption(option: AutocompleteOption): void {
    if (option.disabled) return;
    this.selectedValue.set(option.value);
    this.searchQuery.set(option.label);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.selectionChange.emit(option.value);
    this.closeDropdown();
  }

  clearSelection(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedValue.set(null);
    this.searchQuery.set('');
    this.onChange(null);
    this.valueChange.emit(null);
    this.selectionChange.emit(null);
    this.cleared.emit();
    this.closeDropdown();
  }

  isOptionSelected(optValue: any): boolean {
    const cur = this.selectedValue();
    if (optValue === null || optValue === undefined || cur === null || cur === undefined) {
      return optValue === cur;
    }
    return String(optValue) === String(cur);
  }

  onKeyDown(event: KeyboardEvent): void {
    const list = this.filteredOptions();
    if (!this.isOpen()) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        this.openDropdown();
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex.update(curr => (curr + 1 < list.length ? curr + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex.update(curr => (curr > 0 ? curr - 1 : list.length - 1));
        break;
      case 'Enter':
        event.preventDefault();
        const idx = this.highlightedIndex();
        if (idx >= 0 && idx < list.length) {
          this.selectOption(list[idx]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      if (this.isOpen()) {
        this.closeDropdown();
      }
    }
  }

  private normalize(str: string): string {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
