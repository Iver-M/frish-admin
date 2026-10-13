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

export function googleMapsView(result, market = PASIG_PUBLIC_MARKET_GEOFENCE, apiKey = '') {
  const hasSubmittedLocation = result?.state !== 'missing'
    && Number.isFinite(result?.latitude)
    && Number.isFinite(result?.longitude)
  const markerLatitude = hasSubmittedLocation ? result.latitude : market.latitude
  const markerLongitude = hasSubmittedLocation ? result.longitude : market.longitude
  const coordinate = `${markerLatitude},${markerLongitude}`
  const embedQuery = new URLSearchParams({ key: apiKey, q: coordinate, zoom: '17', maptype: 'roadmap' })
  const openQuery = new URLSearchParams({ api: '1', query: coordinate })

  return {
    provider: 'google_maps',
    api: 'maps_embed',
    configured: Boolean(apiKey),
    embedUrl: apiKey ? `https://www.google.com/maps/embed/v1/place?${embedQuery}` : '',
    openUrl: `https://www.google.com/maps/search/?${openQuery}`,
    markerLabel: hasSubmittedLocation ? 'Submitted scan location' : 'Pasig Public Market reference',
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
