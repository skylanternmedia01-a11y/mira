const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sent' },
  viewed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Viewed' },
  contacted: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Contacted' },
  quoted: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Quoted' },
  converted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Converted' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'Declined' },
  proposed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Proposed' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: status }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}
