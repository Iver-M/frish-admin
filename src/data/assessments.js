// Dummy data for the Assessments page.
// Swap `assessments` for a real fetch later; the table/modal only depend on this shape.
// marketId scopes each assessment to a market for Market Admin filtering.
// photo: the catch photo captured by the inspector at assessment time.

import samplePhoto1 from '../assets/images/samples/sample-catch-1.jpg'
import samplePhoto2 from '../assets/images/samples/sample-catch-2.jpg'

export const assessments = [
  { id: 'DLGREG-344', species: 'Dalagang Bukid (Redbelly Yellowtail Fusilier)', prediction: 'Fresh', confidence: 96, shelfLife: '2-3 days', decision: 'Pass', inspector: 'Juan Dela Cruz', createdDate: '2026-07-08', status: 'fresh', eye: 'Fresh', gills: 'Fresh', skin: 'Fresh', ammonia: '7 ppm', temperature: '3.2°C', humidity: '71%', gasResistance: '18 kΩ', storage: 'Chilled on ice', notes: 'Clear eyes, firm flesh, no odor detected.', location: 'Pasig Public Market, Stall 12', marketId: 'pasig', photo: samplePhoto2 },
  { id: 'DLGREG-398', species: 'Galunggong (Round Scad)', prediction: 'Fresh', confidence: 93, shelfLife: '2 days', decision: 'Pass', inspector: 'Juan Dela Cruz', createdDate: '2026-07-08', status: 'fresh', eye: 'Fresh', gills: 'Fresh', skin: 'Fresh', ammonia: '9 ppm', temperature: '3.8°C', humidity: '74%', gasResistance: '16 kΩ', storage: 'Chilled on ice', notes: 'Bright gills, firm texture.', location: 'Pasig Public Market, Stall 4', marketId: 'pasig', photo: samplePhoto1 },
  { id: 'DLG-447', species: 'Galunggong (Indian Scad)', prediction: 'Not Fresh', confidence: 89, shelfLife: 'Not recommended', decision: 'Fail', inspector: 'Juan Dela Cruz', createdDate: '2026-07-08', status: 'not-fresh', eye: 'Not Fresh', gills: 'Not Fresh', skin: 'Moderately Fresh', ammonia: '126 ppm', temperature: '14.4°C', humidity: '73%', gasResistance: '3 kΩ', storage: 'Non-chilled display', notes: 'Cloudy eyes, strong ammonia odor.', location: 'Pasig Public Market, Stall 8', marketId: 'pasig', photo: samplePhoto2 },
  { id: 'DLG-451', species: 'Dalagang Bukid (Double-lined Fusilier)', prediction: 'Moderately Fresh', confidence: 81, shelfLife: '1 day', decision: 'Conditional Pass', inspector: 'Maria Santos', createdDate: '2026-07-08', status: 'moderate', eye: 'Fresh', gills: 'Moderately Fresh', skin: 'Moderately Fresh', ammonia: '38 ppm', temperature: '6.2°C', humidity: '77%', gasResistance: '10 kΩ', storage: 'Chilled on ice', notes: 'Slight discoloration on gills.', location: 'Pasig Public Market, Stall 21', marketId: 'pasig', photo: samplePhoto1 },
  { id: 'DLG-452', species: 'Galunggong (Shortfin Scad)', prediction: 'Fresh', confidence: 97, shelfLife: '3 days', decision: 'Pass', inspector: 'Maria Santos', createdDate: '2026-07-07', status: 'fresh', eye: 'Fresh', gills: 'Fresh', skin: 'Fresh', ammonia: '6 ppm', temperature: '2.9°C', humidity: '70%', gasResistance: '20 kΩ', storage: 'Chilled on ice', notes: 'Excellent condition overall.', location: 'Pasig Public Market, Stall 3', marketId: 'pasig', photo: samplePhoto2 },
  { id: 'DLG-453', species: 'Dalagang Bukid (Redbelly Yellowtail Fusilier)', prediction: 'Moderately Fresh', confidence: 78, shelfLife: '1 day', decision: 'Conditional Pass', inspector: 'Ramon Reyes', createdDate: '2026-07-07', status: 'moderate', eye: 'Moderately Fresh', gills: 'Moderately Fresh', skin: 'Fresh', ammonia: '42 ppm', temperature: '7.1°C', humidity: '75%', gasResistance: '9 kΩ', storage: 'Non-chilled display', notes: 'Slight softness in flesh.', location: 'Pasig Public Market, Stall 55', marketId: 'pasig', photo: samplePhoto1 },
  { id: 'DLG-454', species: 'Galunggong (Round Scad)', prediction: 'Fresh', confidence: 91, shelfLife: '2 days', decision: 'Pass', inspector: 'Ramon Reyes', createdDate: '2026-07-07', status: 'fresh', eye: 'Fresh', gills: 'Fresh', skin: 'Fresh', ammonia: '11 ppm', temperature: '3.9°C', humidity: '72%', gasResistance: '15 kΩ', storage: 'Chilled on ice', notes: 'Good gill coloration.', location: 'Pasig Public Market, Stall 19', marketId: 'pasig', photo: samplePhoto2 },
  { id: 'DLG-455', species: 'Galunggong (Indian Scad)', prediction: 'Not Fresh', confidence: 94, shelfLife: 'Not recommended', decision: 'Fail', inspector: 'Juan Dela Cruz', createdDate: '2026-07-06', status: 'not-fresh', eye: 'Not Fresh', gills: 'Not Fresh', skin: 'Not Fresh', ammonia: '158 ppm', temperature: '13.8°C', humidity: '76%', gasResistance: '2 kΩ', storage: 'Non-chilled display', notes: 'Strong odor, discolored gills.', location: 'Pasig Public Market, Stall 4', marketId: 'pasig', photo: samplePhoto1 },
]

export function getAssessments() {
  return assessments
}

export function getAssessmentById(id) {
  return assessments.find((a) => a.id === id)
}
