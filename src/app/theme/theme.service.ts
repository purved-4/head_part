import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { COLORS } from '../utils/constants';

export type ThemeMode = 'light' | 'dark';
export type ColorKey =
  | 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'teal'
  | 'rose' | 'indigo' | 'amber' | 'cyan' | 'slate' | 'violet';
  
export interface ColorPalette {
  label: string;
  swatchLight: string;
  swatchDark: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export const COLOR_PALETTES: Record<ColorKey, ColorPalette> = COLORS;

const STORAGE_KEY_MODE = 'app-theme-mode';
const STORAGE_KEY_COLOR = 'app-theme-color';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly mode = signal<ThemeMode>(this.loadMode());
  readonly color = signal<ColorKey>(this.loadColor());

  readonly isDark = computed(() => this.mode() === 'dark');
  readonly palette = computed(() => COLOR_PALETTES[this.color()]);
  readonly palettes = COLOR_PALETTES;
  readonly colorKeys = Object.keys(COLOR_PALETTES) as ColorKey[];

  constructor() {
    effect(() => {
      this.applyTheme(this.mode(), this.color());
    });
  }

  toggleMode(): void {
    const nextMode: ThemeMode = this.mode() === 'light' ? 'dark' : 'light';
    this.mode.set(nextMode);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_MODE, nextMode);
    }
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    }
  }

  setColor(color: ColorKey): void {
    this.color.set(color);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_COLOR, color);
    }
  }

  private applyTheme(mode: ThemeMode, color: ColorKey): void {
    if (!this.isBrowser) return;

    const palette = COLOR_PALETTES[color];
    const vars = mode === 'dark' ? palette.dark : palette.light;
    const root = document.documentElement;

    Object.entries(vars).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });

    root.setAttribute('data-theme', mode);
    root.classList.toggle('dark', mode === 'dark');
  }

  private loadMode(): ThemeMode {
    if (!this.isBrowser) return 'light';

    const stored = localStorage.getItem(STORAGE_KEY_MODE) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private loadColor(): ColorKey {
    if (!this.isBrowser) return 'blue';
    const stored = localStorage.getItem(STORAGE_KEY_COLOR) as ColorKey | null;
    return stored && COLOR_PALETTES[stored] ? stored : 'blue';
  }
}