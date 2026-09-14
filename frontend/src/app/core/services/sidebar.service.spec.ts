import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { SidebarService } from './sidebar.service';

describe('SidebarService (Unit Tests)', () => {
  it('should initialize with isOpen = false', () => {
    const service = new SidebarService();
    expect(service.isOpen()).toBe(false);
  });

  it('should open, close, and toggle sidebar state', () => {
    const service = new SidebarService();

    service.open();
    expect(service.isOpen()).toBe(true);

    service.close();
    expect(service.isOpen()).toBe(false);

    service.toggle();
    expect(service.isOpen()).toBe(true);

    service.toggle();
    expect(service.isOpen()).toBe(false);
  });
});
