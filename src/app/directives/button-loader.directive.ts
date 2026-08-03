import {
  Directive, ElementRef, Input, OnInit, OnDestroy,
  Renderer2, inject, Injector, runInInjectionContext, effect,
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

  // Auto-generated — no @Input() loaderKey needed
  private readonly uniqueKey = `btn-loader-${Math.random().toString(36).slice(2)}`;
  private wrapperEl: HTMLElement | null = null;
  private spinnerEl: HTMLElement | null = null;
  private unlistenClick?: () => void;

  ngOnInit(): void {
  this.injectKeyframes();

  const btn = this.el.nativeElement;
  const handler = () => {
    if (btn.disabled) return;
    this.loaderService.setPendingKey(this.uniqueKey);
  };

  // capture: true makes this fire BEFORE Angular's (click) handler
  btn.addEventListener('click', handler, true);
  this.unlistenClick = () => btn.removeEventListener('click', handler, true);

  runInInjectionContext(this.injector, () => {
    effect(() => {
      const active = this.loaderService.activeButtonLoader();
      this.toggleLoader(!!active && active === this.uniqueKey);
    });
  });
}

  private toggleLoader(isLoading: boolean): void {
    const btn = this.el.nativeElement;

    if (isLoading) {
      if (!this.wrapperEl) {
        const wrapper = this.renderer.createElement("span");
        this.renderer.setStyle(wrapper, "display", "none");
        const children = Array.from(btn.childNodes) as ChildNode[];
        children.forEach((child) => this.renderer.appendChild(wrapper, child));
        this.renderer.appendChild(btn, wrapper);
        this.wrapperEl = wrapper;
      }

      if (!this.spinnerEl) {
        const spinner = this.renderer.createElement("span");
        spinner.innerHTML = this.buildSpinnerHTML();
        this.renderer.appendChild(btn, spinner);
        this.spinnerEl = spinner;
      }

      btn.disabled = true;
      this.renderer.setStyle(btn, "opacity", "0.72");
      this.renderer.setStyle(btn, "cursor", "not-allowed");

    } else {
      if (this.spinnerEl) {
        this.renderer.removeChild(btn, this.spinnerEl);
        this.spinnerEl = null;
      }
      if (this.wrapperEl) {
        this.renderer.setStyle(this.wrapperEl, "display", "");
        this.wrapperEl = null;
      }

      btn.disabled = false;
      this.renderer.removeStyle(btn, "opacity");
      this.renderer.removeStyle(btn, "cursor");
    }
  }

  private buildSpinnerHTML(): string {
    const text = this.loaderText?.trim() || "Loading...";
    return `
      <span class="btn-loader-spinner" style="display:inline-flex;align-items:center;gap:8px;">
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
    this.unlistenClick?.();
    const btn = this.el.nativeElement;
    if (this.wrapperEl) this.renderer.setStyle(this.wrapperEl, "display", "");
    if (this.spinnerEl) this.renderer.removeChild(btn, this.spinnerEl);
  }
}