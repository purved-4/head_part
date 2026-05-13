
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ElementRef,
  ViewChild,
  forwardRef,
  TemplateRef,
  ViewContainerRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
  SimpleChanges,
  OnChanges
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

export interface DropdownOption {
  [key: string]: any;
}

@Component({
  selector: "app-drop-down",
  templateUrl: "./drop-down.component.html",
  styleUrls: ["./drop-down.component.css"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableDropdownComponent),
      multi: true,
    },
  ],
})
export class SearchableDropdownComponent
  implements OnInit, AfterViewInit, OnDestroy, ControlValueAccessor ,OnChanges
{
  @Input() options: DropdownOption[] = [];
  @Input() placeholder: string = "Select an option...";
  @Input() defaultValue: any = null;
  @Input() clearable: boolean = true;

  // dynamic field names for id and name
  @Input() idField: string = "id";
  @Input() nameField: string = "name";

  // Tailwind class inputs with defaults matching your CSS
  @Input() containerClass: string = ""; // wrapper (default w-full in template)
  @Input() inputWrapClass: string = ""; // wrapper around input
  @Input() inputClass: string = ""; // extra input classes
  @Input() arrowClass: string = ""; // arrow button classes
  @Input() listWrapperClass: string = ""; // wrapper around list (positioning)
  @Input() listClass: string = ""; // list classes
  @Input() itemClass: string = ""; // default item classes
  @Input() highlightedClass: string = "bg-slate-50 text-blue-500"; // highlighted item
  @Input() optionTextClass: string = ""; // classes for text inside option
  @Input() noResultsClass: string = ""; // "no results" text style
  @Input() dropdownMaxHeightMode: "default" | "match-input" | "scale-input" =
    "default";
  @Input() dropdownScale: number = 6;
  @Output() selectionChange = new EventEmitter<any>(); // emits id only
  @Output() searchChange = new EventEmitter<string>();
  // new inputs for sizing
  @Input() dropdownWidth: string | null = null; // e.g. "300px" or "80%"
  @Input() dropdownMaxHeight: string | null = null; // e.g. "300px" or "50vh"
  @Input() inputWidth: string | null = null; // e.g. "200px" or "80%" or "200"
  @Input() inputHeight: string | null = null;
  @Input() matchInputSize: boolean = false;
  @ViewChild("searchInput", { read: ElementRef })
  searchInput!: ElementRef<HTMLInputElement>;
@Input() externalDisplayValue: string = "";
  // Host element for positioning
  @ViewChild("hostEl", { read: ElementRef })
  hostEl!: ElementRef<HTMLElement>;

  // TemplateRef for the panel that will be rendered into overlay
  @ViewChild("panelTpl", { read: TemplateRef })
  panelTpl!: TemplateRef<any>;

  @ViewChild('innerInput', { read: ElementRef }) 
  innerInput!: ElementRef;

@Output() focusEvent = new EventEmitter<void>();
  

  isOpen = false;
  searchTerm = "";
  filteredOptions: any[] = [];
  highlightedIndex = -1;
  selectedOption: DropdownOption | null = null;
  displayValue = "";

  // overlay state
  private overlayEl: HTMLElement | null = null;
  private embeddedViewRef: any = null;
  appendToBody = true; // default on: append floating panel to body
  private outsideClickHandler = (ev: Event) => this.onDocumentClick(ev);
  private repositionHandler = () => this.repositionOverlay();

  // CVA
  private onChange = (value: any) => {};
  private onTouched = () => {};

  constructor(private vcr: ViewContainerRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.filteredOptions = [...this.options];

    if (this.defaultValue !== null && this.defaultValue !== undefined) {
      this.setDefaultValue();
    }
  }
// ngOnChanges(changes: SimpleChanges): void {

//   if (changes["options"]) {

//     const options = changes["options"].currentValue || [];

//     if (
//       options.length > 0 &&
//       this.searchTerm?.trim()
//     ) {
//       this.isOpen = true;
//     }
//   }

// if (changes["externalDisplayValue"]) {

//   const value =
//     changes["externalDisplayValue"].currentValue || "";

//   this.displayValue = value;

//   this.searchTerm = value;

//   this.filterOptions();
// }
// }

ngOnChanges(changes: SimpleChanges): void {

  // OPTIONS UPDATED ASYNC
  if (changes["options"]) {

    const options =
      changes["options"].currentValue || [];

    this.filteredOptions = [...options];

    // IMPORTANT FIX
    if (
      this.searchTerm?.trim() &&
      options.length > 0
    ) {

      // dropdown already open but overlay stale
      if (this.isOpen) {

        // refresh overlay
        this.closeDropdown();

        setTimeout(() => {
          this.openDropdown();
        });

      } else {

        this.openDropdown();
      }
    }
  }

  // EXTERNAL DISPLAY VALUE
  if (changes["externalDisplayValue"]) {

    const value =
      changes["externalDisplayValue"]
        .currentValue || "";

    this.displayValue = value;

    this.searchTerm = value;

    this.filterOptions();
  }
}
  ngAfterViewInit(): void {
    // nothing special, hostEl and panelTpl are available now
  }

 focus() {
  // delay a tick so any DOM updates (form reset, ngIf, navigation flags) settle
  setTimeout(() => {
    try {
      // 1) prefer explicit inner input
      if (this.innerInput?.nativeElement) {
        
        this.innerInput.nativeElement.focus();
        return;
      }
    } catch (err) {
     }
  }, 0);
}



  // === Helpers ===
  getOptionLabel(option: any): string {
    if (!option) return "";
    return option[this.nameField] ?? option.name ?? option.label ?? "";
  }

  getOptionId(option: any): any {
    if (!option) return null;
    return option[this.idField] ?? option.id ?? option.value ?? null;
  }

  private setDefaultValue() {
    const defaultOption = this.options.find(
      (opt) => String(this.getOptionId(opt)) === String(this.defaultValue)
    );
    if (defaultOption) {
      this.selectedOption = defaultOption;
      this.displayValue = this.getOptionLabel(defaultOption);
      this.searchTerm = "";
      this.onChange(this.getOptionId(defaultOption));
    }
  }

  // === Open/Close ===
  openDropdown() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.filteredOptions = [...this.options];

    if (this.selectedOption) {
      const idx = this.filteredOptions.findIndex(
        (opt) =>
          String(this.getOptionId(opt)) ===
          String(this.getOptionId(this.selectedOption))
      );
      this.highlightedIndex = idx >= 0 ? idx : 0;
    } else {
      this.highlightedIndex = this.filteredOptions.length > 0 ? 0 : -1;
    }

    // append panel to body (overlay) or render inline depending on flag
    if (this.appendToBody) {
      this.createOverlay();
    } else {
      // inline behavior — nothing else required (keeps previous behavior)
    }

    setTimeout(() => {
      try {
        this.searchInput.nativeElement.focus();
      } catch (e) {}
    }, 0);
  }

  toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  onFocus() {
    if (!this.isOpen) this.openDropdown();
  }

  onBlur() {
    // keep previous short delay behavior — if overlay appended to body, closing is handled by outside click
    if (!this.appendToBody) {
      setTimeout(() => {
        this.isOpen = false;
        this.onTouched();
        if (this.selectedOption) {
          this.displayValue = this.getOptionLabel(this.selectedOption);
        }
      }, 150);
    }
  }

  onSearch(event: any) {
    const value = event.target.value;
    this.searchTerm = value;
    this.displayValue = value;
    this.filterOptions();
    this.highlightedIndex = this.filteredOptions.length > 0 ? 0 : -1;
    this.searchChange.emit(value);
    if (!this.isOpen) this.openDropdown();
  }

  onPaste(event: ClipboardEvent) {
    setTimeout(() => {
      const pastedText = event.clipboardData?.getData("text") || "";
      if (pastedText) {
        this.searchTerm = pastedText;
        this.displayValue = pastedText;
        this.filterOptions();
        this.highlightedIndex = this.filteredOptions.length > 0 ? 0 : -1;
        if (!this.isOpen) this.openDropdown();
        this.searchChange.emit(pastedText);
      }
    }, 0);
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.isOpen && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      this.openDropdown();
    }
    if (!this.filteredOptions || this.filteredOptions.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.highlightedIndex =
          this.highlightedIndex < 0
            ? 0
            : (this.highlightedIndex + 1) % this.filteredOptions.length;
        this.scrollToHighlighted();
        break;
      case "ArrowUp":
        event.preventDefault();
        this.highlightedIndex =
          this.highlightedIndex <= 0
            ? this.filteredOptions.length - 1
            : this.highlightedIndex - 1;
        this.scrollToHighlighted();
        break;
      case "Enter":
      case "Tab":
        event.preventDefault();
        if (this.highlightedIndex < 0 && this.filteredOptions.length > 0)
          this.highlightedIndex = 0;
        if (
          this.highlightedIndex >= 0 &&
          this.filteredOptions[this.highlightedIndex]
        ) {
          this.selectOption(this.filteredOptions[this.highlightedIndex]);
        } else if (this.filteredOptions.length === 1) {
          this.selectOption(this.filteredOptions[0]);
        }
        break;
      case "Escape":
        this.closeDropdown();
        try {
          this.searchInput.nativeElement.blur();
        } catch (e) {}
        break;
    }
  }

  private scrollToHighlighted() {
    // uses DOM queries by class names in the template
    const dropdownList = document.querySelector(".dropdown-list");
    const highlightedItem = document.querySelector(
      ".dropdown-item." + this.highlightedClass.split(" ").join(".")
    ) as HTMLElement | null;
    if (dropdownList && highlightedItem) {
      highlightedItem.scrollIntoView({ block: "nearest" });
    }
  }

  // pointerdown to reliably select by mouse/touch before blur
  onItemPointerDown(option: DropdownOption, evt: PointerEvent) {
    evt.preventDefault();
    this.selectOption(option);
  }

  selectOption(option: DropdownOption) {
    this.selectedOption = option;
    this.displayValue = this.getOptionLabel(option);
    this.searchTerm = "";
    // close overlay
    this.closeDropdown();
    this.highlightedIndex = -1;

    const id = this.getOptionId(option);
    this.onChange(id);
    this.selectionChange.emit(id);

    this.filteredOptions = [...this.options];
  }

  private filterOptions() {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.filteredOptions = [...this.options];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredOptions = this.options.filter((option) => {
      const label = (this.getOptionLabel(option) || "").toLowerCase();
      const idStr =
        this.getOptionId(option) != null
          ? String(this.getOptionId(option)).toLowerCase()
          : "";
      return label.includes(term) || idStr.includes(term);
    });
  }

  highlightMatch(text: string, term: string): string {
    if (!term || !term.trim()) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return (text || "").replace(
      regex,
      '<span class="bg-amber-50 font-semibold">$1</span>'
    );
  }

  // === Overlay logic: render panelTpl into an overlay appended to body ===
  private createOverlay() {
    if (!this.panelTpl || this.overlayEl) return;

    // create wrapper element
    this.overlayEl = this.renderer.createElement("div");
    this.renderer.addClass(this.overlayEl, "app-drop-down-panel");
    this.renderer.setStyle(this.overlayEl, "position", "absolute");
    this.renderer.setStyle(this.overlayEl, "z-index", "9999");
    this.renderer.setStyle(this.overlayEl, "pointer-events", "auto");

    // create embedded view and attach its root nodes into overlay
    this.embeddedViewRef = this.vcr.createEmbeddedView(this.panelTpl);
    this.embeddedViewRef.detectChanges();
    this.embeddedViewRef.rootNodes.forEach((node: any) =>
      this.renderer.appendChild(this.overlayEl, node)
    );

    // append to body
    this.renderer.appendChild(document.body, this.overlayEl);

    // position overlay and apply width/height settings
    this.repositionOverlay();

    // listen for outside clicks & reposition
    document.addEventListener("click", this.outsideClickHandler, true);
    window.addEventListener("resize", this.repositionHandler);
    window.addEventListener("scroll", this.repositionHandler, true);
  }

  private repositionOverlay() {
    if (!this.overlayEl || !this.hostEl) return;

    const inputRect = this.searchInput?.nativeElement?.getBoundingClientRect();
    const hostRect = (
      this.hostEl.nativeElement as HTMLElement
    ).getBoundingClientRect();

    // compute left/top
    const left = hostRect.left + window.scrollX;
    const top = hostRect.bottom + window.scrollY;

    // --- WIDTH resolution (priority: dropdownWidth -> inputWidth -> matchInputSize -> host width)
    let widthCss: string;

    if (this.dropdownWidth) {
      const w = String(this.dropdownWidth).trim();
      if (w.endsWith("%")) {
        const pct = parseFloat(w.slice(0, -1));
        widthCss = isNaN(pct)
          ? `${hostRect.width}px`
          : `${(hostRect.width * pct) / 100}px`;
      } else {
        widthCss = w.match(/^[0-9]+$/) ? `${w}px` : w;
      }
    } else if (this.inputWidth) {
      const w = String(this.inputWidth).trim();
      if (w.endsWith("%")) {
        const pct = parseFloat(w.slice(0, -1));
        widthCss = isNaN(pct)
          ? `${hostRect.width}px`
          : `${(hostRect.width * pct) / 100}px`;
      } else {
        widthCss = w.match(/^[0-9]+$/) ? `${w}px` : w;
      }
    } else if (this.matchInputSize && inputRect) {
      widthCss = `${inputRect.width}px`;
    } else {
      widthCss = `${hostRect.width}px`;
    }

    this.renderer.setStyle(this.overlayEl, "left", `${left}px`);
    this.renderer.setStyle(this.overlayEl, "top", `${top}px`);
    this.renderer.setStyle(this.overlayEl, "width", widthCss);

    // --- HEIGHT resolution for the scrolling list (priority: dropdownMaxHeight -> inputHeight -> dropdownMaxHeightMode -> default)
    const listEl = this.overlayEl.querySelector(
      ".dropdown-list"
    ) as HTMLElement | null;
    if (listEl) {
      if (this.dropdownMaxHeight) {
        this.renderer.setStyle(listEl, "max-height", this.dropdownMaxHeight);
      } else if (this.inputHeight && inputRect) {
        const h = String(this.inputHeight).trim();
        if (h.endsWith("%")) {
          const pct = parseFloat(h.slice(0, -1));
          if (!isNaN(pct)) {
            const computed = (inputRect.height * pct) / 100;
            this.renderer.setStyle(listEl, "max-height", `${computed}px`);
          } else {
            this.renderer.setStyle(
              listEl,
              "max-height",
              `${inputRect.height}px`
            );
          }
        } else if (h.match(/^[0-9]+$/)) {
          this.renderer.setStyle(listEl, "max-height", `${h}px`);
        } else {
          // assume user passed valid css (px, rem, vh, etc.)
          this.renderer.setStyle(listEl, "max-height", h);
        }
      } else if (this.dropdownMaxHeightMode === "match-input" && inputRect) {
        this.renderer.setStyle(listEl, "max-height", `${inputRect.height}px`);
      } else if (this.dropdownMaxHeightMode === "scale-input" && inputRect) {
        const scaled = inputRect.height * (this.dropdownScale || 6);
        this.renderer.setStyle(listEl, "max-height", `${scaled}px`);
      } else {
        this.renderer.setStyle(listEl, "max-height", "208px"); // default
      }
    }
  }

  private onDocumentClick(ev: Event) {
    if (!this.overlayEl || !this.hostEl) return;
    const target = ev.target as Node;
    if (this.hostEl.nativeElement.contains(target)) {
      // clicks inside host (input) — ignore
      return;
    }
    if (this.overlayEl.contains(target)) {
      // clicks inside overlay — ignore (selection handled)
      return;
    }
    // outside click -> close
    this.closeDropdown();
  }

  closeDropdown() {
    if (this.appendToBody && this.overlayEl) {
      // destroy embedded view
      if (this.embeddedViewRef) {
        try {
          this.embeddedViewRef.destroy();
        } catch (e) {}
        this.embeddedViewRef = null;
      }
      // remove overlay element
      try {
        this.renderer.removeChild(document.body, this.overlayEl);
      } catch (e) {}
      this.overlayEl = null;

      // remove listeners
      document.removeEventListener("click", this.outsideClickHandler, true);
      window.removeEventListener("resize", this.repositionHandler);
      window.removeEventListener("scroll", this.repositionHandler, true);
    }

    this.isOpen = false;
  }

  ngOnDestroy() {
    this.closeDropdown();
  }

  // CVA
  // writeValue(value: any): void {
  //   if (value !== null && value !== undefined) {
  //     const option = this.options.find(
  //       (opt) => String(this.getOptionId(opt)) === String(value)
  //     );
  //     if (option) {
  //       this.selectedOption = option;
  //       this.displayValue = this.getOptionLabel(option);
  //       this.searchTerm = "";
  //     } else {
  //       this.selectedOption = null;
  //       this.displayValue = "";
  //       this.searchTerm = "";
  //     }
  //   } else {
  //     this.selectedOption = null;
  //     this.displayValue = "";
  //     this.searchTerm = "";
  //   }
  //   this.filteredOptions = [...this.options];
  // }
writeValue(value: any): void {

  if (value !== null && value !== undefined) {

    const option = this.options.find(
      (opt) => String(this.getOptionId(opt)) === String(value)
    );

    if (option) {

      this.selectedOption = option;

      // DO NOT OVERRIDE OCR/USER TYPED TEXT
      if (!this.externalDisplayValue?.trim()) {

        this.displayValue = this.getOptionLabel(option);

      }

      this.searchTerm = "";

    } else {

      this.selectedOption = null;

      if (!this.externalDisplayValue?.trim()) {

        this.displayValue = "";
      }

      this.searchTerm = "";
    }

  } else {

    this.selectedOption = null;

    if (!this.externalDisplayValue?.trim()) {

      this.displayValue = "";
    }

    this.searchTerm = "";
  }

  this.filteredOptions = [...this.options];
}


  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    /* implement if needed */
  }
}
