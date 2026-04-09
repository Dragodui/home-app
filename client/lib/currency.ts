import type { Home } from "./types";

export const DEFAULT_HOME_CURRENCY = "USD";

export function getHomeCurrency(home: Home | null | undefined): string {
  const currency = home?.currency?.toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : DEFAULT_HOME_CURRENCY;
}

export function formatCurrencyAmount(
  amount: number,
  currency: string,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(options?.maximumFractionDigits ?? 2)} ${currency}`;
  }
}
