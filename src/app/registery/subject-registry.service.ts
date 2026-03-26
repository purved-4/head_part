import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

type RegistryItem = {
  subject: BehaviorSubject<any>;
  factory: () => BehaviorSubject<any>;
  initialValue: any;
};

@Injectable({
  providedIn: "root",
})
export class SubjectRegistryService {
  private registry = new Map<string, RegistryItem>();

  register(
    key: string,
    factory: () => BehaviorSubject<any>,
    initialValue: any = null
  ) {
    if (!this.registry.has(key)) {
      this.registry.set(key, {
        subject: factory(),
        factory,
        initialValue,
      });
    }

    return this.registry.get(key)!.subject;
  }

  getSubject(key: string) {
    return this.registry.get(key)?.subject;
  }

  setValue(key: string, value: any) {
    const item = this.registry.get(key);
    if (item) {
      item.subject.next(value);
    }
  }

  reset(key: string) {
    const item = this.registry.get(key);
    if (item) {
      item.subject.next(item.initialValue);
    }
  }

  recreate(key: string) {
    const item = this.registry.get(key);
    if (!item) return;

    item.subject.complete();

    const newSubject = item.factory();

    this.registry.set(key, {
      ...item,
      subject: newSubject,
    });
  }

  resetAndRecreateAll() {
    for (const key of this.registry.keys()) {
      this.recreate(key);
    }
  }

  destroyAll() {
    for (const item of this.registry.values()) {
      item.subject.complete();
    }
    this.registry.clear();
  }
}