'use client'
// components/TaskTable.tsx
import { Folder, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, buildFolderUrl, STATUS_LABELS } from '@/lib/utils'

interface Inquiry {
  id: string
  leadNumber: string
  inquiryDate: string
  company: string
  agent: string
  client: string
  task: string
  priority: string
  status: string
  srcPath?: string | null
  modifications: number
  designer?: { id: string; name: string } | null
}

interface Props {
  inquiries: Inquiry[]
  total: number
  page: number
  onPageChange: (page: number) => void
  onRowClick: (inquiry: Inquiry) => void
  limit?: number
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'status-pending',
  IN_PROCESS: 'status-in-process',
  COMPLETE: 'status-complete',
  PRODUCTION: 'status-production',
}

const PRIORITY_CLASS: Record<string, string> = {
  LOW: 'text-gray-400',
  NORMAL: 'text-gray-600',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-600 font-semibold',
}

export default function TaskTable({ inquiries, total, page, onPageChange, onRowClick, limit = 14, isLoading }: Props & { isLoading?: boolean }) {
  const totalPages = Math.ceil(total / limit)

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, page - 2)
    return start + i
  }).filter(p => p <= totalPages)

  return (
    <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex flex-col border border-gray-100 overflow-hidden">
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-[13px] whitespace-nowrap">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-100">
              <th className="px-4 py-4 text-left text-gray-400 font-medium w-10">Sr</th>
              <th className="px-4 py-4 text-left text-gray-400 font-medium tracking-wide">Lead Number</th>
              <th className="px-4 py-4 text-center text-gray-400 font-medium tracking-wide">Date&amp;Time</th>
              <th className="px-4 py-4 text-left text-gray-400 font-medium tracking-wide">Company</th>
              <th className="px-4 py-4 text-left text-gray-400 font-medium tracking-wide">Agent</th>
              <th className="px-4 py-4 text-left text-gray-400 font-medium tracking-wide">Client</th>
              <th className="px-4 py-4 text-left text-gray-400 font-medium tracking-wide">Task</th>
              <th className="px-4 py-4 text-left text-gray-400 font-medium tracking-wide">Priority</th>
              <th className="px-4 py-4 text-left text-gray-400 font-medium tracking-wide">Designer</th>
              <th className="px-4 py-4 text-center text-gray-400 font-medium tracking-wide">Change</th>
              <th className="px-4 py-4 text-left text-gray-400 font-medium tracking-wide">Status</th>
              <th className="px-4 py-4 text-center text-gray-400 font-medium tracking-wide">Src Path</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="py-20 text-center text-gray-400">Loading inquiries...</td>
              </tr>
            ) : inquiries.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400 text-sm">
                  No inquiries found
                </td>
              </tr>
            ) : null}
            {inquiries.map((inq, i) => (
              <tr
                key={inq.id}
                onClick={() => onRowClick(inq)}
                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3 text-gray-400 text-center font-medium">
                  {String((page - 1) * limit + i + 1).padStart(2, '0')}
                </td>
                <td className="px-4 py-3 text-gray-600 font-medium">{inq.leadNumber}</td>
                <td className="px-4 py-3 text-gray-500 text-center text-xs">{formatDate(inq.inquiryDate)}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[100px] truncate">{inq.company}</td>
                <td className="px-4 py-3 text-gray-500">{inq.agent}</td>
                <td className="px-4 py-3 text-gray-500">{inq.client}</td>
                <td className="px-4 py-3 text-gray-500">{inq.task}</td>
                <td className={`px-4 py-3 text-xs ${PRIORITY_CLASS[inq.priority] || 'text-gray-500'}`}>
                  {inq.priority.charAt(0) + inq.priority.slice(1).toLowerCase()}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[100px] truncate">
                  {inq.designer?.name?.split(' ')[0] ?? '—'}
                </td>
                <td className="px-4 py-3 text-center text-gray-400">
                  {String(inq.modifications).padStart(2, '0')}
                </td>
                <td className={`px-4 py-3 text-xs ${STATUS_CLASS[inq.status]}`}>
                  {STATUS_LABELS[inq.status]}
                </td>
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                  {inq.srcPath ? (
                    <a
                      href={buildFolderUrl(inq.srcPath)}
                      title={inq.srcPath}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Folder size={16} />
                    </a>
                  ) : (
                    <span className="text-gray-200">
                      <Folder size={16} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination - styled exactly like Image 3 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-6 px-6 py-4 bg-white border-t border-gray-100 mt-auto">
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1 rounded text-[#F5C518] hover:bg-yellow-50 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`relative px-1 transition-colors ${
                  p === page ? 'text-[#F5C518]' : 'hover:text-gray-600'
                }`}
              >
                {String(p).padStart(2, '0')}
                {p === page && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#F5C518] rounded-full" />
                )}
              </button>
            ))}
            {totalPages > 5 && <span className="text-gray-300 tracking-widest">... {String(totalPages).padStart(2, '0')}</span>}
          </div>
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1 rounded text-[#F5C518] hover:bg-yellow-50 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
