import { Component, inject, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ColorKey, COLOR_PALETTES } from './theme.service';

@Component({
  selector: 'app-theme',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme.component.html',
  styleUrl: './theme.component.scss',
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);
  private el = inject(ElementRef);

  isOpen = false;

  toggle() { this.isOpen = !this.isOpen; }
  close()  { this.isOpen = false; }

  palette(key: ColorKey) { return COLOR_PALETTES[key]; }

  currentSwatch(): string {
    const p = this.palette(this.theme.color());
    return this.theme.isDark() ? p.swatchDark : p.swatchLight;
  }

  // Close when clicking outside
  @HostListener('document:click', ['$event'])
  onOutsideClick(e: MouseEvent) {
    if (this.isOpen && !this.el.nativeElement.contains(e.target)) {
      this.close();
    }
  }
}