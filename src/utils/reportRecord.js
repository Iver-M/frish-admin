const REPORT_STATUS_ALIASES = {
  pending: 'submitted',
  'pending review': 'submitted',
  'pending-review': 'submitted',
  submitted: 'submitted',
  'findings submitted': 'submitted',
  'findings-submitted': 'submitted',
  assigned: 'assigned',
  investigating: 'in progress',
  'under investigation': 'in progress',
  'under-investigation': 'in progress',
  'in progress': 'in progress',
  'in-progress': 'in progress',
  'forwarded to lgu': 'forwarded-lgu',
  'forwarded-lgu': 'forwarded-lgu',
  'forwarded_to_lgu': 'forwarded-lgu',
  'escalated to lgu': 'forwarded-lgu',
  'escalated-to-lgu': 'forwarded-lgu',
  'escalated_to_lgu': 'forwarded-lgu',
  validated: 'resolved',
  closed: 'resolved',
  resolved: 'resolved',
}

export function normalizeReportStatus(status) {
  const key = String(status || 'submitted').trim().toLowerCase()
  return REPORT_STATUS_ALIASES[key] || 'submitted'
}

export function normalizeReportSource(report = {}) {
  const source = String(report.sourceType || report.reporterType || '').trim().toLowerCase()
  if (source.includes('consumer')) return 'consumer'
  if (source.includes('follow')) return 'follow-up'
  if (source.includes('inspector') || report.assessment || report.inspector) return 'inspector'
  return 'unknown'
}

export function isReportAssignable(report = {}) {
  const source = normalizeReportSource(report)
  return source === 'consumer'
    || source === 'follow-up'
    || report.requiresFollowUp === true
    || report.followUpRequired === true
}

export function normalizeAssessmentEvidence(assessment) {
  if (!assessment || typeof assessment !== 'object') return null

  const rawImage = assessment.imageUrl || assessment.photoUrl || assessment.image || ''
  const sensor = assessment.sensor && typeof assessment.sensor === 'object' ? assessment.sensor : {}
  const location = assessment.location && typeof assessment.location === 'object' ? assessment.location : {}

  return {
    ...assessment,
    id: assessment.id || '',
    scanId: assessment.scanId || '',
    fishType: assessment.fishType || assessment.species || 'Not recorded',
    freshness: assessment.freshness || assessment.prediction || 'Not recorded',
    confidence: numericValue(assessment.confidence),
    overallStatus: assessment.overallStatus || assessment.decision || 'Not recorded',
    shelfLife: assessment.shelfLife ?? null,
    storageRecommendation: assessment.storageRecommendation || assessment.storage || 'Not recorded',
    sensor: {
      temperature: sensor.temperature ?? assessment.temperature ?? null,
      humidity: sensor.humidity ?? assessment.humidity ?? null,
      ammonia: sensor.ammonia ?? assessment.ammonia ?? null,
      gasResistance: sensor.gasResistance ?? assessment.gasResistance ?? null,
    },
    location: {
      latitude: location.latitude ?? assessment.latitude ?? null,
      longitude: location.longitude ?? assessment.longitude ?? null,
    },
    timestamp: assessment.timestamp || assessment.createdAt || null,
    detectedParts: Array.isArray(assessment.detectedParts) ? assessment.detectedParts : [],
    imageUrl: isRemoteEvidenceUrl(rawImage) ? rawImage : '',
    localImagePath: rawImage && !isRemoteEvidenceUrl(rawImage) ? rawImage : '',
  }
}

export function normalizeReportRecord(report = {}) {
  const nestedVendor = report.vendor && typeof report.vendor === 'object' ? report.vendor : {}
  const nestedInspector = report.inspector && typeof report.inspector === 'object' ? report.inspector : {}
  const sourceType = normalizeReportSource(report)
  const assessment = normalizeAssessmentEvidence(report.assessment)
  const canonicalFieldsMissing = [
    'reportCode',
    'title',
    'vendorName',
    'assignedMarket',
    'marketId',
    'description',
  ].filter((field) => !cleanStoredValue(report[field]))

  return {
    ...report,
    title: report.title || report.issue || `${assessment?.fishType || 'Fish'} inspection report`,
    vendorName: report.vendorName || nestedVendor.vendorName || 'Vendor not recorded',
    stallNumber: report.stallNumber || nestedVendor.stallNumber || '',
    contactNumber: report.contactNumber || nestedVendor.contactNumber || '',
    assignedMarket: report.assignedMarket || report.location || 'Pasig Public Market',
    marketId: report.marketId || 'pasig',
    description: report.description || nestedInspector.findings || report.issue || 'No findings recorded.',
    actionTaken: report.actionTaken || nestedInspector.actionTaken || '',
    sourceType,
    status: normalizeReportStatus(report.status),
    createdAt: report.createdAt || report.date || null,
    updatedAt: report.updatedAt || report.createdAt || report.date || null,
    assignedInspectorName: report.assignedInspectorName || report.assignedInspector || '',
    assessment,
    compatibility: {
      legacyMobileSchema: Boolean(report.vendor || report.inspector),
      canonicalFieldsMissing,
      reporterReachable: Boolean(report.createdBy?.uid),
      remotelyAccessibleImage: Boolean(assessment?.imageUrl),
    },
  }
}

export function reportSourceLabel(report) {
  return ({
    consumer: 'Consumer',
    inspector: 'Inspector',
    'follow-up': 'Follow-up',
  })[normalizeReportSource(report)] || 'Unknown'
}

function isRemoteEvidenceUrl(value) {
  return /^(https?:\/\/|data:image\/)/i.test(String(value || ''))
}

function numericValue(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function cleanStoredValue(value) {
  return typeof value === 'string' ? value.trim() : value
}
