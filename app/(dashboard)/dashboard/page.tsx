import { useState, useEffect } from 'react'
import { Search, Plus, Calendar } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import StatsCards from '@/components/StatsCards'
import TaskTable from '@/components/TaskTable'
import InquiryModal from '@/components/InquiryModal'
import AddInquiryModal from '@/components/AddInquiryModal'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'

interface Inquiry {
  id: string; leadNumber: string; inquiryDate: string; company: string; agent: string
  client: string; task: string; priority: string; status: string; srcPath?: string | null
  modifications: number; designer?: { id: string; name: string } | null
}

const PAGE_LIMIT = 14
const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  useSession({ required: true })

  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeDesigner, setActiveDesigner] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [today, setToday] = useState('')

  useEffect(() => {
    const d = new Date()
    setToday(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(PAGE_LIMIT))
  if (search) params.set('search', search)
  if (activeDesigner) params.set('designerId', activeDesigner)
  if (activeStatus) params.set('status', activeStatus)

  const { data, isLoading: loadingTable, mutate } = useSWR(`/api/inquiries?${params.toString()}`, fetcher, {
    keepPreviousData: true,
  })

  const inquiries = data?.inquiries || []
  const total = data?.total || 0

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  function handleDesignerFilter(id: string | null) {
    setActiveDesigner(id)
    setPage(1)
  }

  function handleStatusFilter(status: string | null) {
    setActiveStatus(status)
    setPage(1)
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar onFilterDesigner={handleDesignerFilter} activeDesigner={activeDesigner} />

      <main className="flex-1 overflow-hidden flex flex-col pt-3">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3 px-8 pt-4 pb-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="search-input"
                type="text"
                placeholder="Search by Lead Number: 1735480"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-100 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 shadow-sm transition-all"
              />
            </div>
            <button type="submit" className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F5C518] hover:bg-[#D4A800] transition-colors shadow-sm cursor-pointer shrink-0">
              <Search size={18} className="text-white" />
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }} className="ghost-btn text-xs py-2 rounded-full px-4">
                Clear
              </button>
            )}
          </form>

          {/* Date */}
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-sm text-gray-600 shadow-sm border border-gray-100">
            <span className="text-sm font-medium">{today}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-8 pb-5">
          <StatsCards onStatusFilter={handleStatusFilter} activeStatus={activeStatus} />
        </div>

        {/* Add Row - filter bar */}
        <div className="px-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 grid grid-cols-4 gap-3">
              <input readOnly placeholder="Lead Number" className="input-field rounded-full text-xs bg-white text-gray-400 cursor-default text-center border-none shadow-sm h-10" />
              <input readOnly placeholder="Client Name" className="input-field rounded-full text-xs bg-white text-gray-400 cursor-default text-center border-none shadow-sm h-10" />
              <input readOnly placeholder="Inquiry Folder" className="input-field rounded-full text-xs bg-white text-gray-400 cursor-default text-center border-none shadow-sm h-10" />
              <input readOnly placeholder="Task Required" className="input-field rounded-full text-xs bg-white text-gray-400 cursor-default text-center border-none shadow-sm h-10" />
            </div>
            <button
              id="add-inquiry-btn"
              onClick={() => setShowAdd(true)}
              className="bg-[#F5C518] hover:bg-[#D4A800] text-black font-semibold text-sm px-8 py-2.5 rounded-full transition-all shadow-sm cursor-pointer shrink-0"
            >
              ADD
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="px-8 pb-6 flex-1 overflow-hidden">
          <TaskTable
            inquiries={inquiries}
            total={total}
            page={page}
            limit={PAGE_LIMIT}
            onPageChange={p => setPage(p)}
            onRowClick={inq => setSelectedId(inq.id)}
            isLoading={loadingTable && inquiries.length === 0}
          />
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 text-center text-xs text-gray-400">
          Design &amp; Developed with ❤️ by MUHAMMAD SHOAIB
        </div>
      </main>

      {/* Modals */}
      <InquiryModal
        inquiryId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdate={() => mutate()}
      />
      <AddInquiryModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => mutate()}
      />
    </div>
  )
}
