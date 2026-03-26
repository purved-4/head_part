import { Component, EventEmitter, Output } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-reload",
  templateUrl: "./reload.component.html",
})
export class ReloadComponent {
  @Output() reload = new EventEmitter<void>();

  constructor(private router: Router) {}

  onReloadClick(): void {
    // 👈 MUST print

    this.reload.emit();
  }
  reloadPage(): void {
    const currentUrl = this.router.url;

    this.router.navigateByUrl("/", { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }
}