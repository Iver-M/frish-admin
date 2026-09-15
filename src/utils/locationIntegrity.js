export const PASIG_PUBLIC_MARKET_GEOFENCE = Object.freeze({
  id: 'pasig',
  name: 'Pasig Public Market',
  latitude: 14.5586,
  longitude: 121.0841,
  radiusMeters: 300,
})

export function assessMarketLocation(location, market = PASIG_PUBLIC_MARKET_GEOFENCE) {
  const latitude = finiteCoordinate(location?.latitude)
  const longitude = finiteCoordinate(location?.longitude)
  if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) {
    return { state: 'missing', label: 'Location not captured', distanceMeters: null, latitude, longitude }
  }

  const distanceMeters = haversineMeters(latitude, longitude, market.latitude, market.longitude)
  const withinRadius = distanceMeters <= market.radiusMeters
  return {
    state: withinRadius ? 'verified' : 'outside',
    label: withinRadius ? 'Within market verification radius' : 'Outside market verification radius',
    distanceMeters,
    latitude,
    longitude,
  }
}

export function locationPlotPosition(result, market = PASIG_PUBLIC_MARKET_GEOFENCE) {
  if (!result || result.state === 'missing') return null
  const northMeters = (result.latitude - market.latitude) * 111_320
  const eastMeters = (result.longitude - market.longitude)
    * 111_320
    * Math.cos((market.latitude * Math.PI) / 180)
  const plotRadius = market.radiusMeters * 1.4
  return {
    x: clamp(50 + (eastMeters / plotRadius) * 44, 6, 94),
    y: clamp(50 - (northMeters / plotRadius) * 44, 6, 94),
  }
}

function haversineMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const earthRadius = 6_371_000
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(latitudeB - latitudeA)
  const longitudeDelta = toRadians(longitudeB - longitudeA)
  const firstLatitude = toRadians(latitudeA)
  const secondLatitude = toRadians(latitudeB)
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function finiteCoordinate(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}
