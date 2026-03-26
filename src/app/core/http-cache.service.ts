import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

interface CacheEntry {
  response: HttpResponse<any>;
  expiry: number;
  tag?: string;
}

@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private cache = new Map<string, CacheEntry>();

  set(key: string, response: HttpResponse<any>, ttl: number, tag?: string) {
    this.cache.set(key, {
      response: response.clone(),
      expiry: Date.now() + ttl,
      tag,
    });
  }

  get(key: string): HttpResponse<any> | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.response.clone();
  }

  invalidateByTag(tag: string) {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tag === tag) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}