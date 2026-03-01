export function formatMoney(
  amount: number | string,
  currencyCode = "USD",
  locale = "en-US",
) {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return `${currencyCode.toUpperCase()} 0.00`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode.toUpperCase()} ${value.toFixed(2)}`;
  }
}

export function currencySymbol(currencyCode = "USD", locale = "en-US") {
  const formatted = formatMoney(0, currencyCode, locale);
  return formatted.replace(/[\d\s.,-]/g, "") || currencyCode.toUpperCase();
}
