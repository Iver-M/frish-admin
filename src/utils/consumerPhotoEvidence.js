// Presentation only: never copy Inspector readings or decisions into Consumer evidence.
export function consumerPhotoEvidence(assessment) {
  if (!assessment || typeof assessment !== 'object') return null
  const rawImage = assessment.imageUrl || assessment.photoUrl || assessment.image
  const imageUrl = typeof rawImage === 'string' && /^(https?:\/\/|data:image\/)/i.test(rawImage) ? rawImage : ''
  const fishType = typeof assessment.fishType === 'string' ? assessment.fishType.trim() : ''
  const freshness = ['Fresh', 'Moderately Fresh', 'Not Fresh', 'Uncertain estimate'].includes(assessment.freshness) ? assessment.freshness : ''
  const species = fishType && fishType !== 'Not recorded' ? fishType : ''
  if (!imageUrl && !species && !freshness) return null
  return { imageUrl, fishType: species, freshness }
}
