const CURRENCY_KEY = 'app_currency_data';

export function setCurrencyData(data: any): void {
  if (!data) return;
  localStorage.setItem(CURRENCY_KEY, JSON.stringify(data));
}

export function getCurrencyData(): any | null {
  const raw = localStorage.getItem(CURRENCY_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getCurrencyList(): any[] {
  return getCurrencyData()?.currencies || [];
}

export function getCurrencyByCode(code: string): any | undefined {
  return getCurrencyList().find(c => c.currency === code);
}

export function getRate(code: string): number | null {
  return getCurrencyByCode(code)?.rate ?? null;
}

export function getParentCurrency(): string | null {
  return getCurrencyData()?.parentCurrency ?? null;
}

export function clearCurrencyData(): void {
  localStorage.removeItem(CURRENCY_KEY);
}