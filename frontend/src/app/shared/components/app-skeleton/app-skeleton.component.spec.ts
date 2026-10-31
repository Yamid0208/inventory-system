import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppSkeletonComponent } from './app-skeleton.component';

describe('AppSkeletonComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([], null as any);

  it('should initialize with default values and generate arrays', () => {
    const component = runInInjectionContext(injector, () => new AppSkeletonComponent());
    expect(component.type()).toBe('table');
    expect(component.rows()).toBe(5);
    expect(component.columns()).toBe(5);
    expect(component.count()).toBe(4);
    expect(component.rowsArray.length).toBe(5);
    expect(component.columnsArray.length).toBe(5);
    expect(component.countArray.length).toBe(4);
  });
});
