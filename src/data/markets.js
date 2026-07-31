// Master list of markets, used to scope Market Admin accounts and to
// filter vendors/inspectors/assessments/reports by marketId.

export const markets = [
  { id: 'pasig', name: 'Pasig Public Market' },
]

export function getMarkets() {
  return markets
}

export function getMarketById(id) {
  return markets.find((m) => m.id === id)
}
