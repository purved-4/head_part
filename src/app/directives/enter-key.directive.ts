import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appEnterKeyFocus]'
})
export class EnterKeyDirective {
  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const formElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'input, select, textarea, button'
      )
    ).filter(
      el => !el.hasAttribute('disabled') && el.tabIndex !== -1
    );

    const currentIndex = formElements.indexOf(event.target as HTMLElement);

    // Forward navigation: Enter or Tab (without Shift)
    if (
      (event.key === 'Enter' && !event.shiftKey) ||
      (event.key === 'Tab' && !event.shiftKey)
    ) {
      // if (currentIndex !== -1 && currentIndex < formElements.length - 1) {
      //   event.preventDefault();
      //   formElements[currentIndex + 1].focus();
      // }

      if (currentIndex !== -1) {

  const currentElement =
    event.target as HTMLElement;

  // IF SUBMIT BUTTON → SUBMIT FORM
  if (
    currentElement instanceof HTMLButtonElement &&
    currentElement.type === "submit"
  ) {

    return;
  }

  // OTHERWISE MOVE FOCUS
  if (currentIndex < formElements.length - 1) {

    event.preventDefault();

    formElements[currentIndex + 1].focus();
  }
}
    }

    // Backward navigation: Shift+Enter or Shift+Tab
    if (
      (event.key === 'Enter' && event.shiftKey) ||
      (event.key === 'Tab' && event.shiftKey)
    ) {
      if (currentIndex !== -1 && currentIndex > 0) {
        event.preventDefault();
        formElements[currentIndex - 1].focus();
      }
    }
  }
}

