'use client'
// components/StatsCards.tsx
import { ArrowUpRight } from 'lucide-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ICONS = (
  <svg width="34" height="34" viewBox="0 0 28 28" fill="none" className="mt-1">
    <rect width="28" height="28" rx="6" fill="#F5C518" fillOpacity="0.1"/>
    <path d="M7 8h14v2H7zM7 12h10v2H7zM7 16h14v2H7zM7 20h8v2H7z" fill="#9ca3af"/>
  </svg>
)

interface Props {
  onStatusFilter: (status: string | null) => void
  activeStatus: string | null
}

export default function StatsCards({ onStatusFilter, activeStatus }: Props) {
  const { data, isLoading } = useSWR('/api/inquiries/counts', fetcher, { refreshInterval: 10000 })

  const cards = [
    { label: 'Pending Inquiries', key: 'pending', status: 'PENDING', count: (data as any)?.pending ?? 0 },
    { label: 'In-Process Inquiries', key: 'inProcess', status: 'IN_PROCESS', count: (data as any)?.inProcess ?? 0 },
    { label: 'Complete Inquiries', key: 'complete', status: 'COMPLETE', count: (data as any)?.complete ?? 0 },
    { label: 'Production Files', key: 'production', status: 'PRODUCTION', count: (data as any)?.production ?? 0 },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <button
          key={card.key}
          onClick={() => onStatusFilter(activeStatus === card.status ? null : card.status)}
          className={`bg-white rounded-2xl p-5 text-left flex items-start gap-4 transition-all duration-200 cursor-pointer border ${
            activeStatus === card.status ? 'border-[#F5C518] shadow-md ring-1 ring-[#F5C518]/20' : 'border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-gray-200'
          }`}
        >
          {ICONS}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-[40px] font-bold text-gray-700 leading-none tracking-tight">
              {isLoading ? '—' : String(card.count).padStart(2, '0')}
            </div>
            <div className="text-[13px] text-gray-400 mt-2 font-medium italic">{card.label}</div>
          </div>
          <div className={`mt-auto p-1.5 rounded-full transition-colors ${activeStatus === card.status ? 'bg-[#F5C518] text-white' : 'bg-gray-50 text-gray-400'}`}>
            <ArrowUpRight size={14} className={activeStatus === card.status ? 'text-white' : 'text-gray-400'} />
          </div>
        </button>
      ))}
    </div>
  )
}
