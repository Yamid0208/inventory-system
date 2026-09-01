import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { AppBadgeComponent } from './app-badge.component';

describe('AppBadgeComponent (Unit Tests)', () => {
  const injector = createEnvironmentInjector([], null as any);

  it('should compute neutral badge styling by default', () => {
    const component = runInInjectionContext(injector, () => new AppBadgeComponent());
    const classes = component.badgeClasses();

    expect(classes).toContain('bg-slate-500/10');
    expect(classes).toContain('text-slate-300');
  });
});
