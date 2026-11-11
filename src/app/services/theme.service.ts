import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'reqbot-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  readonly theme = signal<Theme>(this.readInitialTheme());

  constructor() {
    this.apply(this.theme());
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    if (isPlatformBrowser(this.platformId)) localStorage.setItem(THEME_KEY, theme);
  }

  private readInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) return 'light';
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private apply(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}
