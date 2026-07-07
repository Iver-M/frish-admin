// Dummy data for the Inspectors page.

export const inspectors = [
  { id: 'EMP-1001', name: 'Juan Dela Cruz', region: 'Pasig City', email: 'juan.delacruz@frish.gov.ph', status: 'active', photo: 'JD' },
  { id: 'EMP-1002', name: 'Maria Santos', region: 'Quiapo, Manila', email: 'maria.santos@frish.gov.ph', status: 'active', photo: 'MS' },
  { id: 'EMP-1003', name: 'Ramon Reyes', region: 'Divisoria, Manila', email: 'ramon.reyes@frish.gov.ph', status: 'active', photo: 'RR' },
  { id: 'EMP-1004', name: 'Liza Fernandez', region: 'Mandaluyong City', email: 'liza.fernandez@frish.gov.ph', status: 'on-leave', photo: 'LF' },
  { id: 'EMP-1005', name: 'Carlo Ventura', region: 'Marikina City', email: 'carlo.ventura@frish.gov.ph', status: 'active', photo: 'CV' },
  { id: 'EMP-1006', name: 'Ana Lopez', region: 'Taguig City', email: 'ana.lopez@frish.gov.ph', status: 'inactive', photo: 'AL' },
]

export function getInspectors() {
  return inspectors
}
