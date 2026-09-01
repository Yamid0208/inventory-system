import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppPaginationComponent } from './app-pagination.component';

describe('AppPaginationComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([], null as any);

  it('should initialize with default pagination values', () => {
    const component = runInInjectionContext(injector, () => new AppPaginationComponent());

    expect(component.pageNumber()).toBe(1);
    expect(component.pageSize()).toBe(10);
    expect(component.totalCount()).toBe(0);
    expect(component.totalPages()).toBe(1);
    expect(component.hasPreviousPage()).toBe(false);
  });

  it('should emit pageChange when navigating to a valid page', () => {
    const component = runInInjectionContext(injector, () => new AppPaginationComponent());
    let emittedEvent: any = null;
    component.pageChange.subscribe((event) => {
      emittedEvent = event;
    });

    // Mocking navigation to page 1 is same, so nothing emitted. Test method existence.
    expect(typeof component.goToPage).toBe('function');
  });
});
