import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { AppSearchComponent } from './app-search.component';

describe('AppSearchComponent (Unit Tests)', () => {
  let component: AppSearchComponent;

  beforeEach(() => {
    vi.useFakeTimers();
    const injector = createEnvironmentInjector([AppSearchComponent], null as any);
    component = injector.get(AppSearchComponent);
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.restoreAllMocks();
  });

  it('should instantiate component with defaults', () => {
    expect(component).toBeTruthy();
    expect(component.query).toBe('');
    expect(component.debounceMs()).toBe(350);
  });

  it('should debounce input emission', () => {
    const emittedValues: string[] = [];
    component.search.subscribe(val => emittedValues.push(val));

    const mockEvent1 = { target: { value: 'Tecl' } } as unknown as Event;
    component.onInput(mockEvent1);

    const mockEvent2 = { target: { value: 'Teclado' } } as unknown as Event;
    component.onInput(mockEvent2);

    // Antes del debounce no debe emitir
    vi.advanceTimersByTime(200);
    expect(emittedValues.length).toBe(0);

    // Al superar los 350ms emite únicamente el valor consolidado
    vi.advanceTimersByTime(200);
    expect(emittedValues.length).toBe(1);
    expect(emittedValues[0]).toBe('Teclado');
  });

  it('should clear query and emit empty string on clear()', () => {
    const emittedValues: string[] = [];
    component.search.subscribe(val => emittedValues.push(val));

    component.query = 'Mouse';
    component.clear();

    expect(component.query).toBe('');
    expect(emittedValues).toContain('');
  });
});
