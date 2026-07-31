import { useMemo, useState } from 'react'
import { FiDownload, FiEye, FiImage, FiMapPin, FiRotateCcw, FiThermometer, FiUser } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Pagination from '../../../components/Pagination.jsx'
import Modal from '../../../components/Modal.jsx'
import { getAssessments } from '../../../data/assessments.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { scopeByMarket } from '../../../utils/scopeByMarket.js'
import './Assessments.css'

const PAGE_SIZE = 6

const FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'not-fresh', label: 'Not Fresh' },
]
const DECISIONS = ['all', 'Pass', 'Conditional Pass', 'Fail']

export default function Assessments() {
  const { user } = useAuth()
  const allAssessments = getAssessments()
  const scopedAssessments = useMemo(() => scopeByMarket(allAssessments, user), [allAssessments, user])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [decisionFilter, setDecisionFilter] = useState('all')
  const [speciesFilter, setSpeciesFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    return scopedAssessments.filter((a) => {
      const matchesQuery =
        a.id.toLowerCase().includes(query.toLowerCase()) ||
        a.species.toLowerCase().includes(query.toLowerCase()) ||
        a.inspector.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter
      const matchesDecision = decisionFilter === 'all' || a.decision === decisionFilter
      const matchesSpecies = speciesFilter === 'all' || a.species === speciesFilter
      return matchesQuery && matchesStatus && matchesDecision && matchesSpecies
    })
  }, [scopedAssessments, query, statusFilter, decisionFilter, speciesFilter])

  const speciesOptions = useMemo(() => Array.from(new Set(scopedAssessments.map((item) => item.species))).sort(), [scopedAssessments])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleQueryChange(v) {
    setQuery(v)
    setPage(1)
  }

  function handleFilterChange(v) {
    setStatusFilter(v)
    setPage(1)
  }
  function resetFilters() { setQuery(''); setStatusFilter('all'); setDecisionFilter('all'); setSpeciesFilter('all'); setPage(1) }

  function handleExport() {
    // UI only — wire this up to a real CSV/PDF export once a backend exists.
    alert('Export started (UI only). This will generate a CSV/PDF once connected to a backend.')
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Assessments</h2>
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={handleQueryChange} placeholder="Search by ID, species, or inspector..." />
        <select className="select-input" value={statusFilter} onChange={(e) => handleFilterChange(e.target.value)}>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select className="select-input" value={speciesFilter} onChange={(e) => { setSpeciesFilter(e.target.value); setPage(1) }} aria-label="Filter by fish species"><option value="all">All supported species</option>{speciesOptions.map((species) => <option key={species} value={species}>{species}</option>)}</select>
        <select className="select-input" value={decisionFilter} onChange={(e) => { setDecisionFilter(e.target.value); setPage(1) }} aria-label="Filter by regulatory decision">{DECISIONS.map((decision) => <option key={decision} value={decision}>{decision === 'all' ? 'All decisions' : decision}</option>)}</select>
        {(query || statusFilter !== 'all' || speciesFilter !== 'all' || decisionFilter !== 'all') && <button className="btn btn-outline btn-sm" onClick={resetFilters}><FiRotateCcw size={14} /> Clear</button>}
        <div className="toolbar-spacer" />
        <button className="btn btn-outline" onClick={handleExport}>
          <FiDownload size={15} /> Export
        </button>
      </div>

      <section className="assessment-board"><div className="assessment-board__heading"><div><h3>Assessment records</h3><p>Image analysis, environmental readings, shelf-life, and decision support.</p></div><span>{filtered.length} records</span></div>{pageRows.length ? <div className="assessment-board__grid">{pageRows.map((item) => <AssessmentCard key={item.id} item={item} onOpen={setSelected} />)}</div> : <div className="assessment-board__empty">No assessments match the selected filters.</div>}</section>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Assessment ${selected.id}` : ''}
        size="lg"
        footer={
          <button className="btn btn-primary btn-sm" onClick={() => setSelected(null)}>
            Close
          </button>
        }
      >
        {selected && (
          <div className="detail-grid">
            {selected.photo ? (
              <img src={selected.photo} alt={`${selected.species} catch photo`} className="assessment-modal-photo" />
            ) : (
              <div className="assessment-modal-photo assessment-modal-photo--empty">
                <FiImage size={28} />
                <span>No photo captured for this assessment</span>
              </div>
            )}
            <DetailRow label="Fish Species" value={selected.species} />
            <DetailRow label="Prediction" value={selected.prediction} />
            <DetailRow label="Confidence" value={`${selected.confidence}%`} />
            <DetailRow label="Estimated Shelf Life" value={selected.shelfLife} />
            <DetailRow label="Regulatory Decision Support" value={selected.decision} />
            <DetailRow label="Eye / Gills / Skin" value={`${selected.eye} / ${selected.gills} / ${selected.skin}`} />
            <DetailRow label="MQ137 Ammonia" value={selected.ammonia} />
            <DetailRow label="BME680 Environment" value={`${selected.temperature} · ${selected.humidity} humidity · ${selected.gasResistance} gas resistance`} />
            <DetailRow label="Storage Condition" value={selected.storage} />
            <DetailRow label="Inspector" value={selected.inspector} />
            <DetailRow label="Location" value={selected.location} />
            <DetailRow label="Created Date" value={selected.createdDate} />
            <DetailRow label="Notes" value={selected.notes} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{value}</span>
    </div>
  )
}

function AssessmentCard({ item, onOpen }) {
  return <article className="assessment-card"><button className="assessment-card__image" onClick={() => onOpen(item)} aria-label={`Review ${item.id}`}>{item.photo ? <img src={item.photo} alt={`${item.species} assessment`} /> : <FiImage />}</button><div className="assessment-card__content"><div className="assessment-card__top"><span><strong>{item.id}</strong><small>{item.createdDate}</small></span><StatusBadge status={item.status} /></div><h4>{item.species}</h4><div className="assessment-card__metrics"><span><b>Confidence</b>{item.confidence}%</span><span><b>Shelf life</b>{item.shelfLife}</span><span><b>Decision</b>{item.decision}</span></div><footer><span><FiUser /> {item.inspector}</span><button className="btn btn-outline btn-sm" onClick={() => onOpen(item)}><FiEye size={13} /> Review</button></footer></div></article>
}
