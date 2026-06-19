import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FingerprintService {

  private fp: string | null = null;

  async getFingerprint(): Promise<string> {
    if (this.fp) return this.fp;

    const cached = sessionStorage.getItem('_dfp');
    if (cached) {
      this.fp = cached;
      return this.fp;
    }

    const raw = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency ?? 0,
      navigator.platform ?? '',
    ].join('|');

    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(raw)
    );

    this.fp = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    sessionStorage.setItem('_dfp', this.fp);
    return this.fp;
  }
}