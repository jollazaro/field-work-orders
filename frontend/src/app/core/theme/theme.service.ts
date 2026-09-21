import { computed, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly modeSignal = signal<ThemeMode>(this.resolveInitialMode());

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  constructor() {
    this.apply(this.modeSignal());
  }

  toggle(): void {
    const next: ThemeMode = this.modeSignal() === 'dark' ? 'light' : 'dark';
    this.modeSignal.set(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    this.apply(next);
  }

  private resolveInitialMode(): ThemeMode {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private apply(mode: ThemeMode): void {
    // Must live on <html> with Ionic's `md`/`ios` mode class so
    // `.ion-palette-dark.md` / `.ion-palette-dark.ios` selectors match.
    document.documentElement.classList.toggle('ion-palette-dark', mode === 'dark');
  }
}
