import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService (Unit Tests)', () => {
  let service: ThemeService;
  let store: Record<string, string> = {};
  let classList: Set<string>;

  beforeEach(() => {
    store = {};
    classList = new Set<string>();

    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };

    const documentMock = {
      documentElement: {
        classList: {
          add: (cls: string) => classList.add(cls),
          remove: (cls: string) => classList.delete(cls),
          contains: (cls: string) => classList.has(cls)
        }
      }
    };

    const windowMock = {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        addEventListener: vi.fn()
      }))
    };

    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('document', documentMock);
    vi.stubGlobal('window', windowMock);

    service = new ThemeService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should initialize with system or light theme by default', () => {
    expect(service.currentTheme()).toBe('system');
    expect(service.isDark()).toBe(false);
    expect(classList.has('dark')).toBe(false);
  });

  it('should set dark theme and add dark class to documentElement', () => {
    service.setTheme('dark');
    expect(service.currentTheme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(classList.has('dark')).toBe(true);
    expect(store['sgi_theme']).toBe('dark');
  });

  it('should set light theme and remove dark class from documentElement', () => {
    service.setTheme('dark');
    expect(service.isDark()).toBe(true);

    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(classList.has('dark')).toBe(false);
    expect(store['sgi_theme']).toBe('light');
  });

  it('should toggle theme between dark and light', () => {
    service.setTheme('light');
    expect(service.isDark()).toBe(false);

    service.toggleTheme();
    expect(service.isDark()).toBe(true);
    expect(classList.has('dark')).toBe(true);

    service.toggleTheme();
    expect(service.isDark()).toBe(false);
    expect(classList.has('dark')).toBe(false);
  });
});
