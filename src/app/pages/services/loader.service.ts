import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class LoaderService {
  private activeRequests = 0;
  isLoading = signal<boolean>(false);
  private activeButton = signal<string | null>(null);

  activeButtonLoader = this.activeButton.asReadonly();

  private activeMutations = 0;
  isButtonLoading = signal<boolean>(false);

  show(): void {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.isLoading.set(true);
    }
  }

  hide(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
    if (this.activeRequests === 0) {
      this.isLoading.set(false);
    }
  }

  // Force reset — error recovery ke liye
  reset(): void {
    this.activeRequests = 0;
    this.isLoading.set(false);
  }

  // showButtonLoader(): void {


  //   this.activeMutations++;
  //   if (this.activeMutations === 1) {
  //     this.isButtonLoading.set(true);
  //   }
  // }

  // hideButtonLoader(): void {
  //   if (this.activeMutations > 0) this.activeMutations--;
  //   if (this.activeMutations === 0) this.isButtonLoading.set(false);
  // }

  // resetButtonLoader(): void {
  //   this.activeMutations = 0;
  //   this.isButtonLoading.set(false);
  // }
  showButtonLoader(key?: any): void {
    this.activeButton.set(key);
  }

  hideButtonLoader(key?: string): void {
    if (!key || this.activeButton() === key) {
      this.activeButton.set(null);
    }
  }

  resetButtonLoader(): void {
    this.activeButton.set(null);
  }
}