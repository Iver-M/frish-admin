import { authorityStatusLabel } from '../services/authorityWorkflow.js'
import { getReportCode } from './reportCode.js'

// Presentation adapters only. Consumer records never become legacy /reports writes.
export function consumerReportView(record, kind) {
  const pending = kind === 'concern'
  const id = pending ? record.reportId : record.caseId
  if (!id || (!pending && record.sourceType !== 'consumer')) return null
  return {
    id, viewKey: `${kind}:${id}`, viewKind: kind, sourceType: 'consumer',
    reportCode: getReportCode({ id: record.sourceConcernReportId || record.reportId || id }),
    title: record.title || 'Consumer fish quality concern',
    vendorName: record.vendorOrStall || 'Vendor not recorded',
    assignedMarket: record.assignedMarket || record.marketName || 'Pasig Public Market',
    description: record.description || 'No findings recorded.', reason: record.reason,
    status: pending ? 'awaiting-review' : ({ in_progress: 'in progress', forwarded_lgu: 'forwarded-lgu' }[record.status] || record.status),
    statusLabel: pending ? 'Awaiting BFAR review' : authorityStatusLabel(record.status),
    assignedInspectorName: record.assignedInspectorName || '',
    assignedInspectorId: record.assignedInspectorId || '',
    createdAt: record.createdAt, updatedAt: record.updatedAt || record.createdAt,
  }
}

export function reportTimestamp(value) {
  const millis = typeof value?.toMillis === 'function' ? value.toMillis()
    : typeof value === 'string' ? Date.parse(value)
      : typeof (value?.seconds ?? value?._seconds) === 'number' ? (value.seconds ?? value._seconds) * 1000 : 0
  return Number.isFinite(millis) && millis > 0 && millis <= 8640000000000000 ? millis : 0
}

export function combineReportViews(inspectorReports, concerns, cases) {
  const promoted = new Set(cases.map(item => item.sourceConcernReportId).filter(Boolean))
  return [
    ...inspectorReports.map(item => ({ ...item, viewKey: `legacy:${item.id}`, viewKind: 'legacy' })),
    ...concerns.filter(item => !promoted.has(item.reportId)).map(item => consumerReportView(item, 'concern')),
    ...cases.map(item => consumerReportView(item, 'authority')),
  ].filter(Boolean)
}

export function reportViewPath(report) {
  const id = encodeURIComponent(report.id)
  return report.viewKind === 'concern' ? `/reports/consumer/${id}`
    : report.viewKind === 'authority' ? `/reports/authority/${id}` : `/reports/${id}`
}

export function reportRouteRoot(path) {
  if (/^\/reports\/(consumer|authority)(\/|$)/.test(path)) return '/consumer-intake'
  if (path.startsWith('/consumer-intake/')) return '/consumer-intake'
  if (path.startsWith('/authority-cases/')) return '/authority-cases'
  if (path.startsWith('/reports/')) return '/reports'
  return path
}

export async function loadPendingReportPages(list, isActive = () => true) {
  const records = new Map()
  const tokens = new Set()
  let pageToken = null
  do {
    const page = await list({ pageSize: 50, ...(pageToken ? { pageToken } : {}) })
    if (!isActive()) return []
    if (!Array.isArray(page?.concerns)) throw new Error('Consumer report list is unavailable.')
    for (const concern of page.concerns) if (concern.reportId) records.set(concern.reportId, concern)
    pageToken = page.nextPageToken || null
    if (pageToken && tokens.has(pageToken)) throw new Error('Consumer report pagination is unavailable.')
    tokens.add(pageToken)
  } while (pageToken)
  return [...records.values()]
}
