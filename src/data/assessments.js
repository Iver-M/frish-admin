// Dummy data for the Assessments page.
// Swap `assessments` for a real fetch later; the table/modal only depend on this shape.

export const assessments = [
  { id: 'DLGREG-344', species: 'Bangus (Milkfish)', prediction: 'Fresh', confidence: 96, shelfLife: '2-3 days', inspector: 'Juan Dela Cruz', createdDate: '2026-07-08', status: 'fresh', notes: 'Clear eyes, firm flesh, no odor detected.', location: 'Pasig Public Market, Stall 12' },
  { id: 'DLGREG-398', species: 'Galunggong', prediction: 'Fresh', confidence: 93, shelfLife: '2 days', inspector: 'Juan Dela Cruz', createdDate: '2026-07-08', status: 'fresh', notes: 'Bright gills, firm texture.', location: 'Pasig Public Market, Stall 4' },
  { id: 'DLG-447', species: 'Tilapia', prediction: 'Not Fresh', confidence: 89, shelfLife: 'Not recommended', inspector: 'Juan Dela Cruz', createdDate: '2026-07-08', status: 'not-fresh', notes: 'Cloudy eyes, strong ammonia odor.', location: 'Pasig Public Market, Stall 8' },
  { id: 'DLG-451', species: 'Tamban (Sardines)', prediction: 'Moderately Fresh', confidence: 81, shelfLife: '1 day', inspector: 'Maria Santos', createdDate: '2026-07-08', status: 'moderate', notes: 'Slight discoloration on gills.', location: 'Quiapo Market, Stall 21' },
  { id: 'DLG-452', species: 'Bangus (Milkfish)', prediction: 'Fresh', confidence: 97, shelfLife: '3 days', inspector: 'Maria Santos', createdDate: '2026-07-07', status: 'fresh', notes: 'Excellent condition overall.', location: 'Quiapo Market, Stall 3' },
  { id: 'DLG-453', species: 'Alumahan (Mackerel)', prediction: 'Moderately Fresh', confidence: 78, shelfLife: '1 day', inspector: 'Ramon Reyes', createdDate: '2026-07-07', status: 'moderate', notes: 'Slight softness in flesh.', location: 'Divisoria Market, Stall 55' },
  { id: 'DLG-454', species: 'Tilapia', prediction: 'Fresh', confidence: 91, shelfLife: '2 days', inspector: 'Ramon Reyes', createdDate: '2026-07-07', status: 'fresh', notes: 'Good gill coloration.', location: 'Divisoria Market, Stall 19' },
  { id: 'DLG-455', species: 'Galunggong', prediction: 'Not Fresh', confidence: 94, shelfLife: 'Not recommended', inspector: 'Juan Dela Cruz', createdDate: '2026-07-06', status: 'not-fresh', notes: 'Strong odor, discolored gills.', location: 'Pasig Public Market, Stall 4' },
  { id: 'DLG-456', species: 'Bangus (Milkfish)', prediction: 'Fresh', confidence: 95, shelfLife: '2-3 days', inspector: 'Maria Santos', createdDate: '2026-07-06', status: 'fresh', notes: 'Firm texture, clear eyes.', location: 'Quiapo Market, Stall 3' },
  { id: 'DLG-457', species: 'Tamban (Sardines)', prediction: 'Fresh', confidence: 88, shelfLife: '2 days', inspector: 'Ramon Reyes', createdDate: '2026-07-06', status: 'fresh', notes: 'Consistent with fresh catch.', location: 'Divisoria Market, Stall 55' },
]

export function getAssessments() {
  return assessments
}

export function getAssessmentById(id) {
  return assessments.find((a) => a.id === id)
}
