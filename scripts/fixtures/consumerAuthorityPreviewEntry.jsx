import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useSearchParams } from 'react-router-dom'
import ConsumerIntake from '../../src/pages/admin/consumer-intake/ConsumerIntake.jsx'
import AuthorityCases from '../../src/pages/admin/authority-cases/AuthorityCases.jsx'
import '../../src/styles/theme.css'
import '../../src/styles/utilities.css'
function Preview() {
  const [params] = useSearchParams()
  return <div style={{ padding: '16px', maxWidth: '1200px', margin: 'auto' }}><p style={{ marginBottom: '16px' }}>Synthetic UI fixture · no Firebase connection</p>{params.get('view') === 'consumer-cases' ? <AuthorityCases embedded selectedCaseId={params.get('caseId') || ''} /> : <ConsumerIntake embedded selectedReportId={params.get('reportId') || ''} />}</div>
}
createRoot(document.getElementById('root')).render(<BrowserRouter><Preview /></BrowserRouter>)
