import { useEffect, useMemo, useState } from 'react'
import { FiAlertCircle, FiDatabase, FiDownload, FiEye, FiImage, FiRotateCcw, FiUser } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Pagination from '../../../components/Pagination.jsx'
import Modal from '../../../components/Modal.jsx'
import { getAssessments } from '../../../data/assessments.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { subscribeMarketRecords } from '../../../services/firestoreService.js'
import {
  formatConfidence,
  formatDetectedPartConfidence,
  normalizeDemoAssessment,
  normalizeScanRecord,
  scanRecordCsvRows,
  scanTimestampValue,
} from '../../../utils/scanRecord.js'
import { scopeByMarket } from '../../../utils/scopeByMarket.js'
import './Assessments.css'

const PAGE_SIZE = 6

const FRESHNESS_FILTERS = [
  { value: 'all', label: 'All freshness results' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'moderate', label: 'Moderately Fresh' },
  { value: 'not-fresh', label: 'Not Fresh' },
  { value: 'unknown', label: 'Unknown / unclassified' },
]

export default function Assessments() {
  const { user, isFirebaseEnabled } = useAuth()
  const [records, setRecords] = useState(() => fallbackRecords(user, isFirebaseEnabled))
  const [loading, setLoading] = useState(isFirebaseEnabled)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [freshnessFilter, setFreshnessFilter] = useState('all')
  const [speciesFilter, setSpeciesFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!isFirebaseEnabled) {
      setRecords(fallbackRecords(user, false))
      setLoading(false)
      setLoadError('')
      return undefined
    }

    setLoading(true)
    setLoadError('')

    return subscribeMarketRecords(
      'scans',
      user,
      (items) => {
        setRecords(items.map(normalizeScanRecord).sort(newestFirst))
        setLoading(false)
        setLoadError('')
      },
      (firebaseError) => {
        setRecords([])
        setLoading(false)
        setLoadError(scanLoadMessage(firebaseError))
      },
    )
  }, [isFirebaseEnabled, user])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return records.filter((record) => {
      const searchable = [
        record.id,
        record.assessmentCode,
        record.species,
        record.prediction,
        record.inspector,
        record.inspectorEmail,
        record.inspectorUid,
      ].join(' ').toLowerCase()
      const matchesQuery = !search || searchable.includes(search)
      const matchesFreshness = freshnessFilter === 'all' || record.status === freshnessFilter
      const matchesSpecies = speciesFilter === 'all' || record.species === speciesFilter
      return matchesQuery && matchesFreshness && matchesSpecies
    })
  }, [records, query, freshnessFilter, speciesFilter])

  const speciesOptions = useMemo(
    () => Array.from(new Set(records.map((item) => item.species))).sort(),
    [records],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = query || freshnessFilter !== 'all' || speciesFilter !== 'all'

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  function handleQueryChange(value) {
    setQuery(value)
    setPage(1)
  }

  function resetFilters() {
    setQuery('')
    setFreshnessFilter('all')
    setSpeciesFilter('all')
    setPage(1)
  }

  function handleExport() {
    if (!filtered.length) return
    downloadCsv(scanRecordCsvRows(filtered))
  }

  return (
    <div className="page assessments-page">
      <div className="page-header-row assessments-page__header">
        <div>
          <p className="workspace-kicker">ASSESSMENTS</p>
          <h2>Field scan records</h2>
          <p className="page-header-row__subtitle">Review image-analysis results recorded by the FRISH Inspector mobile app.</p>
        </div>
        <span className={`assessments-source ${isFirebaseEnabled ? 'assessments-source--live' : ''}`}>
          <i /> {isFirebaseEnabled ? 'Live Firebase scans' : 'Demo records'}
        </span>
      </div>

      <div className="toolbar workspace-toolbar assessments-page__toolbar">
        <SearchBar value={query} onChange={handleQueryChange} placeholder="Search ID, species, or inspector..." />
        <select
          className="select-input"
          value={freshnessFilter}
          onChange={(event) => { setFreshnessFilter(event.target.value); setPage(1) }}
          aria-label="Filter by freshness result"
        >
          {FRESHNESS_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
        </select>
        <select
          className="select-input"
          value={speciesFilter}
          onChange={(event) => { setSpeciesFilter(event.target.value); setPage(1) }}
          aria-label="Filter by fish species"
        >
          <option value="all">All detected species</option>
          {speciesOptions.map((species) => <option key={species} value={species}>{species}</option>)}
        </select>
        {hasFilters && <button className="btn btn-outline btn-sm" onClick={resetFilters}><FiRotateCcw size={14} /> Clear</button>}
        <div className="toolbar-spacer" />
        <button className="btn btn-outline" onClick={handleExport} disabled={loading || filtered.length === 0}>
          <FiDownload size={15} /> Export CSV
        </button>
      </div>

      <section className="assessment-board">
        <div className="assessment-board__heading">
          <div>
            <h3>Inspector scan evidence</h3>
            <p>Freshness classification, confidence, detections, inspector identity, and submission time.</p>
          </div>
          <span>{loading ? 'Loading records…' : `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`}</span>
        </div>

        {loading ? (
          <BoardState icon={<FiDatabase />} title="Loading live scans" detail="Waiting for the latest records from Firestore…" loading />
        ) : loadError ? (
          <BoardState icon={<FiAlertCircle />} title="Live scans are unavailable" detail={loadError} error />
        ) : pageRows.length ? (
          <div className="assessment-board__grid">
            {pageRows.map((item) => <AssessmentCard key={item.id} item={item} onOpen={setSelected} />)}
          </div>
        ) : (
          <BoardState
            icon={<FiDatabase />}
            title={hasFilters ? 'No matching scan records' : 'No scans have been submitted yet'}
            detail={hasFilters ? 'Try clearing one or more filters.' : 'New compatible mobile scans will appear here automatically.'}
          />
        )}
      </section>

      {!loading && !loadError && filtered.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
        />
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Assessment ${selected.assessmentCode}` : ''}
        size="lg"
        footer={<button className="btn btn-primary btn-sm" onClick={() => setSelected(null)}>Close</button>}
      >
        {selected && <AssessmentDetail record={selected} />}
      </Modal>
    </div>
  )
}

function AssessmentDetail({ record }) {
  const isLive = record.source === 'firebase'

  return (
    <div className="assessment-detail">
      {record.photo ? (
        <img src={record.photo} alt={`${record.species} scan evidence`} className="assessment-modal-photo" />
      ) : (
        <div className="assessment-modal-photo assessment-modal-photo--empty">
          <FiImage size={28} />
          <strong>Image unavailable in the admin portal</strong>
          <span>{record.imagePath ? 'The mobile app stored a device-local path, not a web-accessible upload.' : 'This record does not contain an image reference.'}</span>
        </div>
      )}

      <div className={`assessment-data-notice ${isLive ? '' : 'assessment-data-notice--demo'}`}>
        <FiAlertCircle />
        <div>
          <strong>{isLive ? 'Mobile data coverage' : 'Demonstration record'}</strong>
          <p>{isLive
            ? 'This source record contains image-analysis metadata only. Sensor readings, shelf-life prediction, GPS coordinates, and a Storage-backed image were not submitted.'
            : 'Firebase is not configured, so the values below come from the portal’s demonstration dataset.'}</p>
        </div>
      </div>

      <div className="detail-grid">
        <DetailRow label="Assessment Code" value={record.assessmentCode} />
        <DetailRow label={isLive ? 'Firestore Document ID' : 'Source Record ID'} value={record.id} wide />
        <DetailRow label="Fish Species" value={record.species} />
        <DetailRow label="Freshness Result" value={record.prediction} />
        <DetailRow label="Confidence" value={formatConfidence(record.confidence)} />
        <DetailRow label="Record Status" value={capitalize(record.recordStatus)} />
        <DetailRow label="Inspector" value={record.inspector} />
        <DetailRow label="Inspector UID" value={record.inspectorUid || 'Not included in this record'} />
        <DetailRow label="Submitted" value={record.createdDate} />
        <DetailRow label="Market" value={record.marketName || record.marketId || 'Not included in this record'} />
        <DetailRow label="Image Availability" value={record.imageAvailability} wide />
        {!isLive && <DetailRow label="Shelf-life (demo)" value={record.raw.shelfLife || 'Not included'} />}
        {!isLive && <DetailRow label="Decision support (demo)" value={record.raw.decision || 'Not included'} />}
      </div>

      <section className="assessment-detections">
        <div className="assessment-detections__heading">
          <div><h4>Detected parts and classes</h4><p>Raw detection metadata submitted with the scan.</p></div>
          <span>{record.detectedParts.length}</span>
        </div>
        {record.detectedParts.length ? (
          <ul>{record.detectedParts.map((part, index) => (
            <li key={`${part.name}-${index}`}><span>{part.name}</span><strong>{formatDetectedPartConfidence(part.confidence)}</strong></li>
          ))}</ul>
        ) : <p className="assessment-detections__empty">No detection list was included in this record.</p>}
      </section>
    </div>
  )
}

function DetailRow({ label, value, wide = false }) {
  return (
    <div className={`detail-row ${wide ? 'detail-row--wide' : ''}`}>
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{value}</span>
    </div>
  )
}

function AssessmentCard({ item, onOpen }) {
  const thirdMetricLabel = item.source === 'demo' ? 'Decision' : 'Detections'
  const thirdMetricValue = item.source === 'demo' ? item.raw.decision || 'Not recorded' : `${item.detectedParts.length} recorded`

  return (
    <article className="assessment-card">
      <button className="assessment-card__image" onClick={() => onOpen(item)} aria-label={`Review assessment ${item.assessmentCode}`}>
        {item.photo ? <img src={item.photo} alt={`${item.species} scan`} /> : <span><FiImage /><small>Image unavailable</small></span>}
      </button>
      <div className="assessment-card__content">
        <div className="assessment-card__top">
          <span className="assessment-card__identity"><strong title={`Firestore ID: ${item.id}`}>{item.assessmentCode}</strong><small>{item.createdDate}</small></span>
          <StatusBadge status={item.status} label={item.prediction} />
        </div>
        <h4>{item.species}</h4>
        <div className="assessment-card__metrics">
          <span><b>Confidence</b>{formatConfidence(item.confidence)}</span>
          <span><b>Record state</b>{capitalize(item.recordStatus)}</span>
          <span><b>{thirdMetricLabel}</b>{thirdMetricValue}</span>
        </div>
        <footer>
          <span title={item.inspector}><FiUser /> {item.inspector}</span>
          <button className="btn btn-outline btn-sm" onClick={() => onOpen(item)}><FiEye size={13} /> Review</button>
        </footer>
      </div>
    </article>
  )
}

function BoardState({ icon, title, detail, loading = false, error = false }) {
  return (
    <div className={`assessment-board__state ${error ? 'assessment-board__state--error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">
      <span className={loading ? 'assessment-board__state-icon assessment-board__state-icon--loading' : 'assessment-board__state-icon'}>{icon}</span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

function fallbackRecords(user, isFirebaseEnabled) {
  if (isFirebaseEnabled) return []
  return scopeByMarket(getAssessments(), user).map(normalizeDemoAssessment).sort(newestFirst)
}

function newestFirst(a, b) {
  return scanTimestampValue(b.createdAt) - scanTimestampValue(a.createdAt)
}

function scanLoadMessage(error) {
  if (error?.code === 'permission-denied') {
    return 'Your BFAR account does not currently have permission to read the scans collection. Update and publish the Firestore scan rules before retrying.'
  }
  return 'The portal could not load scans from Firestore. Check the connection and try again.'
}

function capitalize(value) {
  return String(value || 'Not recorded').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function downloadCsv(rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((line) => line.map(csvCell).join(','))
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `frish-field-scans-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}
