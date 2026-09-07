const formatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formats a numeric amount as Ghana Cedi, e.g. "GH₵ 1,250.00". */
export function formatGHS(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount) : (amount ?? 0)
  const formatted = formatter.format(Number.isFinite(value) ? value : 0)
  // Intl gives "GH₵1,250.00" — the spec wants a space after the symbol.
  return formatted.replace(/^(GH₵|GHS)\s?/, 'GH₵ ')
}
