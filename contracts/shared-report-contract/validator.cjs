'use strict'

const CONTRACT_VERSION = '1.0.0'
const DOCUMENT_SCHEMA_VERSION = '1.0'
const SAFE_ID = /^[A-Za-z0-9_-]+$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REASONS = new Set(['spoiled_at_scan', 'spoiled_after_purchase', 'suspected_treatment', 'other'])
const AUTHORITY_STATUSES = new Set(['submitted', 'assigned', 'in_progress', 'forwarded_lgu', 'resolved', 'closed_no_violation'])
const ANALYSIS_STATES = new Set(['unavailable', 'experimental_unapproved', 'approved'])

const CONCERN_KEYS = [
  'schemaVersion', 'reportId', 'scanId', 'ownerId', 'marketName',
  'reporterName', 'reporterEmail', 'vendorOrStall', 'reason', 'description',
  'resultSummary', 'status', 'deliveryMode', 'createdAt', 'submittedAt',
]
const AUTHORITY_KEYS = [
  'schemaVersion', 'caseId', 'sourceConcernReportId', 'sourceScanId',
  'reporterRef', 'sourceType', 'marketId', 'assignedMarket', 'title',
  'vendorOrStall', 'reason', 'description', 'reporterContactPolicy',
  'evidenceReferences', 'analysisSummary', 'analysisTrustState', 'status',
  'assignedInspectorId', 'assignedInspectorName', 'createdAt', 'updatedAt',
  'promotedAt', 'promotedBy', 'version',
]
const ANALYSIS_KEYS = [
  'class', 'confidence', 'species', 'modelId', 'modelVersion',
  'datasetVersion', 'inferenceSource', 'qualityState', 'trustedAt',
  'approvedAnalysisRecordId',
]

function result(valid, code = null) { return { valid, code } }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) }
function exactKeys(value, expected) {
  return isObject(value)
    && Object.keys(value).length === expected.length
    && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key))
}
function bounded(value, maximum, allowEmpty = false) {
  return typeof value === 'string'
    && (allowEmpty || value.length > 0)
    && value.length <= maximum
    && value === value.trim()
}
function nullableBounded(value, maximum) { return value === null || bounded(value, maximum) }
function isTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && !Number.isNaN(Date.parse(value))
}
function hasForbiddenEvidence(value, key = '') {
  const normalizedKey = key.toLowerCase()
  if (/(uri|url|base64|bytes|image|storagepath)/.test(normalizedKey)) return true
  if (typeof value === 'string') {
    return /^(file|content|data):/i.test(value)
      || /firebasestorage\.googleapis\.com/i.test(value)
  }
  if (Array.isArray(value)) return value.some((item) => hasForbiddenEvidence(item))
  if (isObject(value)) return Object.entries(value).some(([childKey, child]) => hasForbiddenEvidence(child, childKey))
  return false
}

function validateConcern(document) {
  if (!exactKeys(document, CONCERN_KEYS)) return result(false, 'unknown_or_missing_field')
  if (document.schemaVersion !== DOCUMENT_SCHEMA_VERSION) return result(false, 'schema_version_mismatch')
  if (!bounded(document.ownerId, 128) || !SAFE_ID.test(document.ownerId)) return result(false, 'invalid_owner_id')
  if (!bounded(document.scanId, 128) || !SAFE_ID.test(document.scanId)) return result(false, 'invalid_scan_id')
  if (document.reportId !== `report_${document.ownerId}_${document.scanId}`) return result(false, 'invalid_deterministic_report_id')
  if (!bounded(document.marketName, 120)
      || !bounded(document.reporterName, 120)
      || !bounded(document.reporterEmail, 254)
      || !EMAIL.test(document.reporterEmail)
      || !bounded(document.vendorOrStall, 160)
      || !bounded(document.description, 2000, true)) return result(false, 'invalid_field_type_or_size')
  if (!REASONS.has(document.reason)) return result(false, 'invalid_reason')
  if (document.resultSummary !== null) return result(false, 'untrusted_analysis_forbidden')
  if (document.status !== 'prototype_saved') return result(false, 'invalid_consumer_status')
  if (document.deliveryMode !== 'firebase_emulator_only') return result(false, 'invalid_delivery_mode')
  if (!isTimestamp(document.createdAt) || !isTimestamp(document.submittedAt)) return result(false, 'invalid_timestamp')
  return result(true)
}

function validateAnalysis(document) {
  if (!ANALYSIS_STATES.has(document.analysisTrustState)) return result(false, 'invalid_analysis_trust_state')
  if (document.analysisTrustState !== 'approved') {
    return document.analysisSummary === null
      ? result(true)
      : result(false, 'analysis_trust_mismatch')
  }
  const analysis = document.analysisSummary
  if (!exactKeys(analysis, ANALYSIS_KEYS)) return result(false, 'analysis_trust_mismatch')
  if (!bounded(analysis.class, 80)
      || typeof analysis.confidence !== 'number'
      || !Number.isFinite(analysis.confidence)
      || analysis.confidence < 0 || analysis.confidence > 1
      || !bounded(analysis.species, 80)
      || !bounded(analysis.modelId, 128)
      || !bounded(analysis.modelVersion, 64)
      || !bounded(analysis.datasetVersion, 64)
      || !bounded(analysis.inferenceSource, 128)
      || !['accepted', 'insufficient', 'rejected'].includes(analysis.qualityState)
      || !isTimestamp(analysis.trustedAt)
      || !bounded(analysis.approvedAnalysisRecordId, 128)) return result(false, 'invalid_approved_analysis')
  return result(true)
}

function validateEvidenceReferences(references) {
  if (!Array.isArray(references) || references.length > 2) return false
  const ids = new Set()
  const roles = new Set()
  for (const reference of references) {
    if (!exactKeys(reference, ['evidenceId', 'assetRole'])
        || !bounded(reference.evidenceId, 128)
        || !SAFE_ID.test(reference.evidenceId)
        || !['eyesAndSkin', 'gills'].includes(reference.assetRole)
        || ids.has(reference.evidenceId)
        || roles.has(reference.assetRole)) return false
    ids.add(reference.evidenceId)
    roles.add(reference.assetRole)
  }
  return true
}

function validateAuthorityCase(document) {
  if (hasForbiddenEvidence(document)) return result(false, 'forbidden_evidence_representation')
  if (isObject(document) && ['reporterEmail', 'reporterName', 'sourceOwnerId'].some((key) => key in document)) {
    return result(false, 'reporter_data_not_minimized')
  }
  if (!exactKeys(document, AUTHORITY_KEYS)) return result(false, 'unknown_or_missing_field')
  if (document.schemaVersion !== DOCUMENT_SCHEMA_VERSION) return result(false, 'schema_version_mismatch')
  if (!bounded(document.caseId, 128) || !SAFE_ID.test(document.caseId)
      || !bounded(document.sourceConcernReportId, 256)
      || !bounded(document.sourceScanId, 128) || !SAFE_ID.test(document.sourceScanId)
      || !bounded(document.reporterRef, 128) || !SAFE_ID.test(document.reporterRef)
      || !bounded(document.marketId, 128) || !SAFE_ID.test(document.marketId)
      || !bounded(document.assignedMarket, 120)
      || !bounded(document.title, 200)
      || !bounded(document.vendorOrStall, 160)
      || !bounded(document.description, 2000, true)) return result(false, 'invalid_field_type_or_size')
  if (document.caseId !== `case_${document.sourceConcernReportId}_v1`) return result(false, 'invalid_deterministic_case_id')
  if (document.reporterRef === document.sourceConcernReportId
      || document.reporterRef === document.sourceScanId
      || /^guest/i.test(document.reporterRef)) return result(false, 'reporter_data_not_minimized')
  if (document.sourceType !== 'consumer') return result(false, 'invalid_source_type')
  if (!REASONS.has(document.reason)) return result(false, 'invalid_reason')
  if (document.reporterContactPolicy !== 'protected_reference_only') return result(false, 'invalid_reporter_contact_policy')
  if (!validateEvidenceReferences(document.evidenceReferences)) return result(false, 'invalid_evidence_reference')
  const analysisResult = validateAnalysis(document)
  if (!analysisResult.valid) return analysisResult
  if (!AUTHORITY_STATUSES.has(document.status)) return result(false, 'invalid_authority_status')
  if (!nullableBounded(document.assignedInspectorId, 128)
      || !nullableBounded(document.assignedInspectorName, 120)
      || (document.assignedInspectorId === null) !== (document.assignedInspectorName === null)) return result(false, 'invalid_inspector_assignment')
  if (!isTimestamp(document.createdAt) || !isTimestamp(document.updatedAt) || !isTimestamp(document.promotedAt)) return result(false, 'invalid_timestamp')
  if (!exactKeys(document.promotedBy, ['uid', 'mechanism'])
      || !bounded(document.promotedBy.uid, 128)
      || document.promotedBy.mechanism !== 'trusted_backend') return result(false, 'invalid_promoter')
  if (!Number.isInteger(document.version) || document.version < 1) return result(false, 'invalid_audit_version')
  return result(true)
}

function resolveFixtureDocument(fixture, fixtureSet) {
  if (!fixture.documentFrom) return fixture.document
  const source = fixtureSet.fixtures.find((candidate) => candidate.name === fixture.documentFrom)
  if (!source || !source.document) throw new Error(`Missing fixture source: ${fixture.documentFrom}`)
  return { ...source.document, ...(fixture.documentPatch || {}) }
}

function validateFixture(fixture, fixtureSet) {
  if (fixtureSet.contractVersion !== CONTRACT_VERSION) return result(false, 'contract_version_mismatch')
  if (fixture.collection === 'statusMapping') return result(false, 'trusted_promotion_required')
  if (fixture.collection === 'concernReports' && fixture.operation !== 'create') return result(false, 'immutable_consumer_concern')
  if (fixture.collection === 'authorityCases' && (fixture.operation !== 'create' || fixture.actor !== 'trusted_backend')) {
    return result(false, 'trusted_backend_required')
  }
  const document = resolveFixtureDocument(fixture, fixtureSet)
  if (fixture.collection === 'concernReports') return validateConcern(document)
  if (fixture.collection === 'authorityCases') {
    const validation = validateAuthorityCase(document)
    if (!validation.valid) return validation
    if (document.status !== 'submitted'
        || document.version !== 1
        || document.createdAt !== document.updatedAt
        || document.createdAt !== document.promotedAt) return result(false, 'invalid_promotion_create_state')
    return validation
  }
  return result(false, 'unknown_collection')
}

module.exports = {
  ANALYSIS_STATES,
  AUTHORITY_STATUSES,
  CONTRACT_VERSION,
  DOCUMENT_SCHEMA_VERSION,
  resolveFixtureDocument,
  validateAuthorityCase,
  validateConcern,
  validateFixture,
}
