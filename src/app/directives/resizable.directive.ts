import { Directive, ElementRef, EventEmitter, HostListener, Output, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appResizable]'
})
export class ResizableDirective {
  @Output() widthChange = new EventEmitter<number>();
  
  private isResizing = false;
  private startX = 0;
  private startWidth = 0;
  private minWidth = 250;
  private maxWidth = 600;
  private resizeHandleWidth = 8;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {
    this.createResizeHandle();
  }

  private createResizeHandle(): void {
    const handle = this.renderer.createElement('div');
    this.renderer.addClass(handle, 'resize-handle');
    this.renderer.setStyle(handle, 'position', 'absolute');
    this.renderer.setStyle(handle, 'right', '-4px');
    this.renderer.setStyle(handle, 'top', '0');
    this.renderer.setStyle(handle, 'width', `${this.resizeHandleWidth}px`);
    this.renderer.setStyle(handle, 'height', '100%');
    this.renderer.setStyle(handle, 'cursor', 'col-resize');
    this.renderer.setStyle(handle, 'z-index', '10');
    this.renderer.appendChild(this.el.nativeElement, handle);
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      event.preventDefault();
      this.isResizing = true;
      this.startX = event.clientX;
      this.startWidth = this.el.nativeElement.offsetWidth;
      
      // Add active styles
      this.renderer.addClass(document.body, 'resizing');
      this.renderer.setStyle(document.body, 'user-select', 'none');
      
      // Create overlay for smooth resizing
      const overlay = this.renderer.createElement('div');
      this.renderer.addClass(overlay, 'resize-overlay');
      this.renderer.setStyle(overlay, 'position', 'fixed');
      this.renderer.setStyle(overlay, 'top', '0');
      this.renderer.setStyle(overlay, 'left', '0');
      this.renderer.setStyle(overlay, 'width', '100%');
      this.renderer.setStyle(overlay, 'height', '100%');
      this.renderer.setStyle(overlay, 'z-index', '9999');
      this.renderer.setStyle(overlay, 'cursor', 'col-resize');
      document.body.appendChild(overlay);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;
    
    const deltaX = event.clientX - this.startX;
    let newWidth = this.startWidth + deltaX;
    
    // Apply constraints
    newWidth = Math.max(this.minWidth, Math.min(newWidth, this.maxWidth));
    
    // Update element width
    this.renderer.setStyle(this.el.nativeElement, 'width', `${newWidth}px`);
    this.widthChange.emit(newWidth);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    this.renderer.removeClass(document.body, 'resizing');
    this.renderer.setStyle(document.body, 'user-select', 'auto');
    
    // Remove overlay
    const overlay = document.querySelector('.resize-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}