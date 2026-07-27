import { Injectable, signal } from "@angular/core";
export const DEFAULT_LOADER_KEY = "__default__";
@Injectable({ providedIn: "root" })
export class LoaderService {
  private activeRequests = 0;
  isLoading = signal<boolean>(false);
  private activeButton = signal<string | null>(null);

  activeButtonLoader = this.activeButton.asReadonly();

  private pendingKey: string | null = null;

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

  // Called by directive on button click
  setPendingKey(key: string): void {
    console.log('[Loader] setPendingKey:', key);
    this.pendingKey = key;
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
  showButtonLoader(key: string = DEFAULT_LOADER_KEY): void {
  if (this.pendingKey) {
    this.activeButton.set(this.pendingKey);
    this.pendingKey = null;
  } else if (!this.activeButton()) {
    this.activeButton.set(key);
  }
}

  hideButtonLoader(key?: string): void {
    console.log('[Loader] hideButtonLoader → key:', key, '| activeButton:', this.activeButton());
    if (!key || this.activeButton() === key) {
      this.activeButton.set(null);
    }
  }

  resetButtonLoader(): void {
    this.activeButton.set(null);
    this.pendingKey = null;
  }
}
