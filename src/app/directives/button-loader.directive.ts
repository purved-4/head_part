import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  Renderer2,
  inject,
  Injector,
  runInInjectionContext,
  effect,
} from "@angular/core";
import { LoaderService } from "../pages/services/loader.service";

@Directive({
  selector: "button[appButtonLoader]",
  standalone: false,
})
export class ButtonLoaderDirective implements OnInit, OnDestroy {
  @Input("appButtonLoader") loaderText: string = "";

  private el = inject(ElementRef<HTMLButtonElement>);
  private renderer = inject(Renderer2);
  private loaderService = inject(LoaderService);
  private injector = inject(Injector);

  private originalHTML = "";

  ngOnInit(): void {
    this.injectKeyframes();
    this.originalHTML = this.el.nativeElement.innerHTML;

    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.toggleLoader(this.loaderService.isButtonLoading());
      });
    });
  }

  private toggleLoader(isLoading: boolean): void {
    const btn = this.el.nativeElement;
    if (isLoading) {
      this.originalHTML = btn.innerHTML;
      btn.innerHTML = this.buildSpinnerHTML();
      btn.disabled = true;
      this.renderer.setStyle(btn, "opacity", "0.72");
      this.renderer.setStyle(btn, "cursor", "not-allowed");
      // ✅ pointer-events button pe NAHI — warna (click) aur submit block hoga
    } else {
      btn.innerHTML = this.originalHTML;
      btn.disabled = false;
      this.renderer.removeStyle(btn, "opacity");
      this.renderer.removeStyle(btn, "cursor");
    }
  }

  private buildSpinnerHTML(): string {
    const text = this.loaderText?.trim() || "Loading...";
    return `
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <svg width="15" height="15" viewBox="0 0 15 15"
          style="animation:_btn-spin_ 0.7s linear infinite;flex-shrink:0;"
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="7.5" cy="7.5" r="5.5"
            fill="none" stroke="currentColor" stroke-width="2"
            stroke-dasharray="26" stroke-dashoffset="8" stroke-linecap="round"/>
        </svg>
        <span>${text}</span>
      </span>`;
  }

  private injectKeyframes(): void {
    if (document.getElementById("_btn-loader-style_")) return;
    const style = document.createElement("style");
    style.id = "_btn-loader-style_";
    style.textContent = `@keyframes _btn-spin_ { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  ngOnDestroy(): void {
    const btn = this.el.nativeElement;
    if (btn.disabled && this.originalHTML) {
      btn.innerHTML = this.originalHTML;
      btn.disabled = false;
    }
  }
}