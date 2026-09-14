import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'sgi_theme';

  currentTheme = signal<ThemeMode>('system');
  isDark = signal<boolean>(false);

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;

    let saved: ThemeMode | null = null;
    try {
      saved = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;
    } catch {
      // Entornos donde localStorage esté deshabilitado o restringido
    }

    const initialTheme: ThemeMode = saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
    this.setTheme(initialTheme);

    // Escuchar cambios de preferencia en el sistema operativo
    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      if (media && media.addEventListener) {
        media.addEventListener('change', () => {
          if (this.currentTheme() === 'system') {
            this.applyTheme();
          }
        });
      }
    }
  }

  setTheme(mode: ThemeMode): void {
    this.currentTheme.set(mode);
    try {
      localStorage.setItem(this.THEME_KEY, mode);
    } catch {
      // Ignorar fallo de almacenamiento
    }
    this.applyTheme();
  }

  toggleTheme(): void {
    const next = this.isDark() ? 'light' : 'dark';
    this.setTheme(next);
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const mode = this.currentTheme();
    let effectiveDark = false;

    if (mode === 'dark') {
      effectiveDark = true;
    } else if (mode === 'light') {
      effectiveDark = false;
    } else {
      // System preference
      if (typeof window !== 'undefined' && window.matchMedia) {
        effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    }

    this.isDark.set(effectiveDark);

    if (effectiveDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
