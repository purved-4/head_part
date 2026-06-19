import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  AfterViewInit,
} from "@angular/core";

import { TurnstileService } from "../pages/services/turnstile.service";
import { environment } from "../../../environment";

@Directive({
  selector: "[appTurnstile]",
})
export class TurnstileDirective implements AfterViewInit, OnDestroy {
  @Input() siteKey: string = environment.turnstileSiteKey;

  private intervalId: any;

  constructor(
    private el: ElementRef<HTMLElement>,
    private turnstileService: TurnstileService,
  ) {}

  ngAfterViewInit(): void {
    this.waitAndRender();
  }

  private waitAndRender(): void {
    if ((window as any).turnstile) {
      this.renderWidget();
      return;
    }

    this.intervalId = setInterval(() => {
      if ((window as any).turnstile) {
        clearInterval(this.intervalId);
        this.renderWidget();
      }
    }, 100);
  }

  private renderWidget(): void {
    this.turnstileService.render(this.el.nativeElement, this.siteKey);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // this.turnstileService.remove();
  }
}