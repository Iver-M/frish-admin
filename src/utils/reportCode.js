// Firestore document IDs remain internal. `reportCode` is the human-facing
// identifier shared by the inspector and admin applications.
export function getReportCode(report) {
  if (report?.reportCode) return report.reportCode
  const number = [...String(report?.id || '')]
    .reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 10000, 0)
  return `RPT-${String(number).padStart(4, '0')}`
}
