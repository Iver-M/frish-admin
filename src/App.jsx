import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import AdminLayout from './layout/AdminLayout.jsx'
import Dashboard from './pages/admin/dashboard/Dashboard.jsx'
import Assessments from './pages/admin/assessment/Assessments.jsx'
import Reports from './pages/admin/reports/Reports.jsx'
import Inspectors from './pages/admin/inspectors/Inspectors.jsx'
import Vendors from './pages/admin/vendors/Vendors.jsx'
import AuditTrail from './pages/admin/audit/AuditTrail.jsx'
import Feedback from './pages/admin/feedback/Feedback.jsx'
import Profile from './pages/admin/profile/Profile.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assessments" element={<Assessments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/inspectors" element={<Inspectors />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/audit-trail" element={<AuditTrail />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Unknown routes redirect to Dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
