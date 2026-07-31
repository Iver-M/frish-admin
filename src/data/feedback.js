// Dummy data for the User Feedback page.
// userType: 'Consumer' | 'Inspector'
// sentiment: 'positive' | 'negative' — drives the thumbs icon in the table.
// status: 'pending' | 'in-progress' | 'resolved'

export const feedbackList = [
  { id: 'FB-2026-001', date: '2026-07-07', time: '6:00 AM', user: 'Carlo Ventura', userType: 'Inspector', category: 'Suggestion', subject: 'Add more fish species to the scan library', comment: 'The app made it so easy to check if the fish I bought was fresh before I even left the market. It would be great to add more species though.', sentiment: 'positive', status: 'pending' },
  { id: 'FB-2026-002', date: '2026-07-07', time: '6:00 AM', user: 'Ana Lopez', userType: 'Consumer', category: 'Bug Report', subject: 'Scan results take too long to load', sentiment: 'negative', status: 'pending', comment: 'Very helpful, though I wish the scan results loaded a bit faster — sometimes it takes almost a minute.' },
  { id: 'FB-2026-003', date: '2026-07-06', time: '5:19 AM', user: 'Mark Aquino', userType: 'Inspector', category: 'Performance', subject: 'Slow loading on assessment history', sentiment: 'negative', status: 'in-progress', comment: 'Good concept, but the assessment history page loads very slowly once there are a lot of records.' },
  { id: 'FB-2026-004', date: '2026-07-05', time: '2:40 PM', user: 'Liza Fernandez', userType: 'Consumer', category: 'Praise', subject: 'Fast response to my report', sentiment: 'positive', status: 'resolved', comment: 'Reported a spoiled batch and it was investigated within the day. Impressive response time!' },
  { id: 'FB-2026-005', date: '2026-07-03', time: '10:12 AM', user: 'Ramon Dizon', userType: 'Consumer', category: 'Suggestion', subject: 'Clearer reporting form instructions', sentiment: 'negative', status: 'resolved', comment: 'The reporting form could use clearer instructions on what actually counts as an issue worth flagging.' },
]

export function getFeedback() {
  return feedbackList
}
