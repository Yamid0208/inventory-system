import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppSortableHeaderComponent } from './app-sortable-header.component';

describe('AppSortableHeaderComponent', () => {
  const injector = createEnvironmentInjector([], null as any);

  it('debe inicializarse con valores por defecto', () => {
    const component = runInInjectionContext(injector, () => new AppSortableHeaderComponent());

    expect(component.key()).toBe('');
    expect(component.isActive()).toBe(false);
    expect(component.ariaSort()).toBe('none');
    expect(component.align()).toBe('left');
  });

  it('emite sortChange al invocar onToggle cuando key está presente', () => {
    const component = runInInjectionContext(injector, () => new AppSortableHeaderComponent());
    (component as any).key = () => 'sku';

    let emittedKey: string | null = null;
    component.sortChange.subscribe((k) => (emittedKey = k));

    component.onToggle();
    expect(emittedKey).toBe('sku');
  });

  it('soporta activación por teclado con Enter y Space', () => {
    const component = runInInjectionContext(injector, () => new AppSortableHeaderComponent());
    (component as any).key = () => 'name';

    let emissions = 0;
    component.sortChange.subscribe(() => emissions++);

    const createKeyMock = (key: string) =>
      ({
        key,
        preventDefault: () => {}
      } as unknown as KeyboardEvent);

    component.onKeydown(createKeyMock('Enter'));
    component.onKeydown(createKeyMock(' '));
    component.onKeydown(createKeyMock('Escape'));

    expect(emissions).toBe(2);
  });
});
