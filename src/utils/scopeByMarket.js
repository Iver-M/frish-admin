/**
 * Filters a list of records down to a Market Admin's assigned market.
 * BFAR Admin (or any role without a marketId) sees everything unfiltered —
 * this mirrors what a real backend would enforce with a scoped query.
 *
 * Records with marketId: null (e.g. inspectors covering a region outside
 * the three demo markets) are only ever visible to BFAR Admin.
 */
export function scopeByMarket(items, user) {
  if (!user || user.role !== 'market_admin') return items
  return items.filter((item) => item.marketId === user.marketId)
}
