// Dummy data for the User Feedback page.

export const feedbackList = [
  { id: 'FB-220', user: 'Carlo Ventura', rating: 5, comment: 'The app made it so easy to check if the fish I bought was fresh before I even left the market.', date: '2026-07-07' },
  { id: 'FB-219', user: 'Ana Lopez', rating: 4, comment: 'Very helpful, though I wish the scan results loaded a bit faster.', date: '2026-07-06' },
  { id: 'FB-218', user: 'Mark Aquino', rating: 3, comment: 'Good concept, but the inspector at our market rarely updates the assessments.', date: '2026-07-05' },
  { id: 'FB-217', user: 'Liza Fernandez', rating: 5, comment: 'Reported a spoiled batch and it was investigated within the day. Impressive response time!', date: '2026-07-04' },
  { id: 'FB-216', user: 'Ramon Dizon', rating: 2, comment: 'The reporting form could use clearer instructions on what counts as an issue.', date: '2026-07-02' },
]

export function getFeedback() {
  return feedbackList
}
