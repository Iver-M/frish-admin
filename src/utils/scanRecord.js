const FALLBACK_TEXT = 'Not included in this record'

export function normalizeScanRecord(record = {}) {
  const id = String(record.id || '')
  const freshness = cleanText(record.freshness) || 'Not recorded'
  const imagePath = cleanText(record.imagePath)
  const creator = isPlainObject(record.createdBy) ? record.createdBy : {}
  const confidence = finiteNumber(record.confidence)

  return {
    id,
    assessmentCode: getAssessmentCode(id, record.fishType),
    source: 'firebase',
    species: cleanText(record.fishType) || 'Unknown species',
    prediction: freshness,
    status: freshnessStatus(freshness),
    confidence,
    detectedParts: normalizeDetectedParts(record.detectedParts),
    imagePath,
    photo: isWebImageUrl(imagePath) ? imagePath : '',
    imageAvailability: imageAvailability(imagePath),
    inspector: cleanText(creator.email) || cleanText(creator.name) || cleanText(creator.uid) || 'Unknown inspector',
    inspectorEmail: cleanText(creator.email),
    inspectorUid: cleanText(creator.uid),
    inspectorRole: cleanText(creator.role),
    recordStatus: cleanText(record.status) || 'Not recorded',
    createdAt: record.createdAt || null,
    createdDate: formatScanTimestamp(record.createdAt),
    marketId: cleanText(record.marketId),
    marketName: cleanText(record.assignedMarket),
    raw: record,
  }
}

export function normalizeDemoAssessment(record = {}) {
  const freshness = cleanText(record.prediction) || cleanText(record.status) || 'Not recorded'

  return {
    ...record,
    id: String(record.id || ''),
    assessmentCode: getAssessmentCode(record.id, record.species),
    source: 'demo',
    species: cleanText(record.species) || 'Unknown species',
    prediction: freshness,
    status: freshnessStatus(freshness),
    confidence: finiteNumber(record.confidence),
    detectedParts: [],
    imagePath: cleanText(record.photo),
    photo: cleanText(record.photo),
    imageAvailability: record.photo ? 'Demo image available' : 'No demo image included',
    inspector: cleanText(record.inspector) || 'Unknown inspector',
    inspectorEmail: '',
    inspectorUid: '',
    inspectorRole: 'inspector',
    recordStatus: cleanText(record.decision) || 'Demo record',
    createdAt: record.createdDate || null,
    createdDate: cleanText(record.createdDate) || 'Date not recorded',
    marketId: cleanText(record.marketId),
    marketName: cleanText(record.location),
    raw: record,
  }
}

export function scanTimestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Date.parse(value) || 0
  return 0
}

export function formatScanTimestamp(value) {
  const timestamp = scanTimestampValue(value)
  if (!timestamp) return 'Date not recorded'

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export function formatScanTimestampForCsv(value) {
  const timestamp = scanTimestampValue(value)
  return timestamp ? new Date(timestamp).toISOString() : ''
}

export function formatConfidence(value) {
  return typeof value === 'number' ? `${formatNumber(value)}%` : FALLBACK_TEXT
}

export function formatDetectedPartConfidence(value) {
  if (typeof value !== 'number') return 'Confidence not recorded'
  const percentage = value >= 0 && value <= 1 ? value * 100 : value
  return `${formatNumber(percentage)}%`
}

export function scanRecordCsvRows(records) {
  return records.map((record) => ({
    'Assessment code': record.assessmentCode,
    'Firestore document ID': record.id,
    'Fish species': record.species,
    'Freshness result': record.prediction,
    'Confidence (%)': typeof record.confidence === 'number' ? formatNumber(record.confidence) : '',
    'Record status': record.recordStatus,
    'Inspector UID': record.inspectorUid,
    'Inspector email': record.inspectorEmail,
    'Submitted at': formatScanTimestampForCsv(record.createdAt),
    'Detected parts': record.detectedParts
      .map((part) => `${part.name} (${formatDetectedPartConfidence(part.confidence)})`)
      .join('; '),
    'Image availability': record.imageAvailability,
    'Market ID': record.marketId,
    'Market name': record.marketName,
  }))
}

export function getAssessmentCode(recordId, species) {
  const id = String(recordId || '').trim()
  const prefix = assessmentPrefix(species)
  const numericParts = id.match(/\d+/g)
  const numericSuffix = numericParts?.length
    ? Number(numericParts.join('').slice(-3))
    : stableHash(id || `${prefix}-assessment`) % 1000
  return `${prefix} - ${String(numericSuffix).padStart(3, '0')}`
}

function freshnessStatus(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (normalized === 'fresh' || normalized === 'very fresh') return 'fresh'
  if (normalized === 'moderate' || normalized === 'moderately fresh') return 'moderate'
  if (['not fresh', 'spoiled', 'stale'].includes(normalized)) return 'not-fresh'
  return 'unknown'
}

function normalizeDetectedParts(value) {
  if (!Array.isArray(value)) return []
  return value.map((part, index) => ({
    name: cleanText(part?.class) || `Detection ${index + 1}`,
    confidence: finiteNumber(part?.confidence),
  }))
}

function imageAvailability(path) {
  if (!path) return 'No image reference included'
  if (isWebImageUrl(path)) return 'Web-accessible image URL'
  return 'Device-local path only'
}

function isWebImageUrl(value) {
  return /^https?:\/\//i.test(value)
}

function finiteNumber(value) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(value)
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function assessmentPrefix(value) {
  const species = String(value || '').trim().toLowerCase()
  if (species.includes('dalagang bukid') || species.includes('fusilier')) return 'DLGBKD'
  if (species.includes('galunggong') || species.includes('scad')) return 'GG'

  const fallback = species.replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase()
  return fallback || 'FISH'
}

function stableHash(value) {
  let hash = 0
  for (const character of String(value)) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0
  return hash
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
