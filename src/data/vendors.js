// Dummy data for the Vendors page.

export const vendors = [
  { id: 'V-001', name: 'Aling Nena Fish Stall', market: 'Pasig Public Market', stallNumber: 'Stall 12', registration: 'REG-2024-0112', status: 'active' },
  { id: 'V-002', name: 'Mang Kiko Seafoods', market: 'Pasig Public Market', stallNumber: 'Stall 4', registration: 'REG-2024-0098', status: 'active' },
  { id: 'V-003', name: 'Fresh Catch Trading', market: 'Quiapo Market', stallNumber: 'Stall 21', registration: 'REG-2023-0231', status: 'active' },
  { id: 'V-004', name: 'Dela Cruz Fishmongers', market: 'Quiapo Market', stallNumber: 'Stall 3', registration: 'REG-2024-0044', status: 'suspended' },
  { id: 'V-005', name: 'Divisoria Bounty Seafoods', market: 'Divisoria Market', stallNumber: 'Stall 55', registration: 'REG-2022-0187', status: 'active' },
  { id: 'V-006', name: 'Ocean Fresh Supply', market: 'Divisoria Market', stallNumber: 'Stall 19', registration: 'REG-2024-0203', status: 'pending' },
]

export function getVendors() {
  return vendors
}
