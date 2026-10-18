import { normalizeReportRecord } from './reportRecord.js'

export function buildVendorRecords(vendorDocuments = [], reportDocuments = []) {
  const records = new Map()

  vendorDocuments.map(normalizeVendorRecord).filter(isPasigRecord).forEach((vendor) => {
    records.set(vendorMatchKey(vendor.ownerName, vendor.stallNo), vendor)
  })

  reportDocuments.map(normalizeReportRecord).filter(isPasigRecord).forEach((report) => {
    if (!report.vendorName || report.vendorName.toLowerCase() === 'vendor not recorded') return
    const directKey = vendorMatchKey(report.vendorName, report.stallNumber)
    const matchingKey = records.has(directKey)
      ? directKey
      : Array.from(records).find(([, vendor]) => normalizedText(vendor.ownerName) === normalizedText(report.vendorName))?.[0]
    const key = matchingKey || directKey
    const existing = records.get(key) || {
      id: vendorDocumentId(report.vendorName, report.stallNumber),
      ownerName: report.vendorName,
      email: report.vendor?.email || '',
      stallName: report.vendorName,
      stallNo: report.stallNumber || '',
      market: 'Pasig Public Market',
      marketId: 'pasig',
      status: 'active',
      compliance: 'Compliant',
      violations: 0,
      reportCount: 0,
      openCaseCount: 0,
      source: 'report-derived',
    }
    const openCaseCount = existing.openCaseCount + (report.status === 'resolved' ? 0 : 1)
    records.set(key, {
      ...existing,
      reportCount: existing.reportCount + 1,
      openCaseCount,
      compliance: deriveVendorCompliance(openCaseCount, existing.compliance, existing.status),
    })
  })

  return Array.from(records.values()).sort((a, b) => a.ownerName.localeCompare(b.ownerName))
}

export function normalizeVendorRecord(vendor = {}) {
  return {
    ...vendor,
    ownerName: vendor.ownerName || vendor.vendorName || 'Unnamed vendor',
    email: vendor.email || '',
    stallName: vendor.stallName || vendor.ownerName || vendor.vendorName || 'Vendor stall',
    stallNo: vendor.stallNo || vendor.stallNumber || '',
    market: 'Pasig Public Market',
    marketId: 'pasig',
    status: vendor.status || 'active',
    compliance: vendor.compliance || 'Compliant',
    violations: Number(vendor.violations || 0),
    reportCount: 0,
    openCaseCount: 0,
    source: vendor.source || 'firestore',
  }
}

export function deriveVendorCompliance(openCases, existing, status) {
  if (status === 'suspended') return 'Non-compliant'
  if (openCases > 0) return 'Under review'
  return existing || 'Compliant'
}

function isPasigRecord(record) {
  return (record.marketId || 'pasig') === 'pasig'
    || String(record.assignedMarket || record.market || '').toLowerCase().includes('pasig')
}

function vendorMatchKey(name, stall) { return `${normalizedText(name)}|${normalizedText(stall)}` }
function normalizedText(value) { return String(value || '').trim().toLowerCase() }
function vendorDocumentId(name, stall) {
  const slug = `${stall || 'unknown'}-${name || 'vendor'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72)
  return `pasig-${slug || 'vendor'}`
}
