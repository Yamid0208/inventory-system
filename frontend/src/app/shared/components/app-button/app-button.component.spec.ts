import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppButtonComponent } from './app-button.component';

describe('AppButtonComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([], null as any);

  it('should compute default primary classes within injection context', () => {
    const component = runInInjectionContext(injector, () => new AppButtonComponent());
    const classes = component.buttonClasses();

    expect(classes).toContain('bg-primary-600');
    expect(classes).toContain('text-white');
    expect(classes).toContain('text-sm');
  });

  it('should emit clicked event when not disabled or loading', () => {
    const component = runInInjectionContext(injector, () => new AppButtonComponent());
    let wasClicked = false;
    component.clicked.subscribe(() => {
      wasClicked = true;
    });

    const mockEvent = { type: 'click' } as unknown as MouseEvent;
    component.handleClick(mockEvent);

    expect(wasClicked).toBe(true);
  });
});
