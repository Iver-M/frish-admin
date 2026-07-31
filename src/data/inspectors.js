// Dummy data for the Inspector Management page.
// marketId scopes an inspector to a market where applicable — inspectors
// covering a region outside the three demo markets have marketId: null and
// are only visible to BFAR Admin (system-wide view).
// assignedArea is the market's full name for display; region is kept for
// search/legacy reference.

export const inspectors = [
  { id: 'INS-001', name: 'Juan Dela Cruz', phone: '09984610022', email: 'jdelacruz@gmail.com', region: 'Pasig City', marketId: 'pasig', assignedArea: 'Pasig Public Market', status: 'active', photo: 'JD', assessmentCount: 257 },
  { id: 'INS-002', name: 'Antonio Cruz', phone: '09673610021', email: 'acruz@gmail.com', region: 'Pasig City', marketId: 'pasig', assignedArea: 'Pasig Public Market', status: 'active', photo: 'AC', assessmentCount: 189 },
  { id: 'INS-003', name: 'Pedro Garcia', phone: '09233710123', email: 'pgarcia@gmail.com', region: 'Pasig City', marketId: 'pasig', assignedArea: 'Pasig Public Market', status: 'active', photo: 'PG', assessmentCount: 67 },
  { id: 'INS-004', name: 'Maria Santos', phone: '09171234567', email: 'maria.santos@frish.gov.ph', region: 'Pasig City', marketId: 'pasig', assignedArea: 'Pasig Public Market', status: 'active', photo: 'MS', assessmentCount: 214 },
  { id: 'INS-005', name: 'Ramon Reyes', phone: '09181234567', email: 'ramon.reyes@frish.gov.ph', region: 'Pasig City', marketId: 'pasig', assignedArea: 'Pasig Public Market', status: 'active', photo: 'RR', assessmentCount: 172 },
  { id: 'INS-006', name: 'Liza Fernandez', phone: '09191234567', email: 'liza.fernandez@frish.gov.ph', region: 'Pasig City', marketId: 'pasig', assignedArea: 'Pasig Public Market', status: 'on-leave', photo: 'LF', assessmentCount: 41 },
  { id: 'INS-007', name: 'Carlo Ventura', phone: '09201234567', email: 'carlo.ventura@frish.gov.ph', region: 'Pasig City', marketId: 'pasig', assignedArea: 'Pasig Public Market', status: 'active', photo: 'CV', assessmentCount: 58 },
  { id: 'INS-008', name: 'Ana Lopez', phone: '09211234567', email: 'ana.lopez@frish.gov.ph', region: 'Pasig City', marketId: 'pasig', assignedArea: 'Pasig Public Market', status: 'inactive', photo: 'AL', assessmentCount: 12 },
]

export function getInspectors() {
  return inspectors
}
