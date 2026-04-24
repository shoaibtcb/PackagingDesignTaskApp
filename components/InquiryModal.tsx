'use client'
// components/InquiryModal.tsx
import { useState, useEffect, useCallback } from 'react'
import { X, Folder, Pencil, Trash2, Save, Printer } from 'lucide-react'
import { formatDate, formatNoteDate, buildFolderUrl, STATUS_LABELS } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'

interface Note { id: string; content: string; createdAt: string; author: { name: string } }
interface Inquiry {
  id: string; leadNumber: string; inquiryDate: string; company: string; agent: string
  client: string; task: string; priority: string; status: string; srcPath?: string | null
  modifications: number; designer?: { id: string; name: string } | null
  product?: string | null; finishedSize?: string | null; quantity?: string | null
  material?: string | null; printing?: string | null; lamination?: string | null
  addOns?: string | null; turnaroundTime?: string | null; jobRef?: string | null
  notes?: Note[]
}

interface Props {
  inquiryId: string | null
  onClose: () => void
  onUpdate: () => void
}

const STATUS_FLOW = ['PENDING', 'IN_PROCESS', 'COMPLETE', 'PRODUCTION']
const PRIORITY_OPTS = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const STATUS_OPTS = ['PENDING', 'IN_PROCESS', 'COMPLETE', 'PRODUCTION']

export default function InquiryModal({ inquiryId, onClose, onUpdate }: Props) {
  const { data: session } = useSession()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Inquiry>>({})
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const fetchInquiry = useCallback(async () => {
    if (!inquiryId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`)
      if (res.ok) { const d = await res.json(); setInquiry(d); setForm(d) }
    } finally { setLoading(false) }
  }, [inquiryId])

  useEffect(() => { fetchInquiry() }, [fetchInquiry])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    if (!inquiry) return
    const toastId = toast.loading('Saving...')
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json(); setInquiry(updated); setForm(updated)
        toast.success('Saved!', { id: toastId }); setEditing(false); onUpdate()
      } else { toast.error('Save failed', { id: toastId }) }
    } catch { toast.error('Error', { id: toastId }) }
  }

  async function handleDelete() {
    if (!inquiry || !confirm('Delete this inquiry?')) return
    const res = await fetch(`/api/inquiries/${inquiry.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); onUpdate(); onClose() }
    else toast.error('Delete failed')
  }

  async function handlePrintReady() {
    if (!inquiry) return
    const nextStatus = 'PRODUCTION'
    const res = await fetch(`/api/inquiries/${inquiry.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    if (res.ok) { const d = await res.json(); setInquiry(d); onUpdate(); toast.success('Moved to Production!') }
  }

  async function handleAddNote() {
    if (!noteText.trim() || !inquiry) return
    setAddingNote(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId: inquiry.id, content: noteText }),
      })
      if (res.ok) {
        setNoteText(''); await fetchInquiry(); onUpdate()
        toast.success('Note added')
      }
    } finally { setAddingNote(false) }
  }

  const isAdmin = session?.user?.role === 'ADMIN'
  const isOwner = session?.user?.id === inquiry?.designer?.id

  if (!inquiryId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex">
        {loading || !inquiry ? (
          <div className="flex-1 flex items-center justify-center py-20 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* LEFT PANEL */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-gray-100">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div>
                    <span className="text-xs text-[#D4A800] font-semibold">Lead Number:</span>
                    <p className="font-bold text-gray-800">{inquiry.leadNumber}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Inquiry Date</span>
                    <p className="text-gray-600 text-xs">{formatDate(inquiry.inquiryDate)}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">Designer</span>
                    <span className="text-sm font-medium text-gray-700">{inquiry.designer?.name ?? '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-400">Modifications:</span>
                    <span className="text-sm font-semibold text-gray-700 ml-1">
                      {String(inquiry.modifications).padStart(2, '0')} times
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Details Table */}
              <div className="space-y-2.5 text-sm border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                {[
                  { label: 'Company', field: 'company' },
                  { label: 'Agent', field: 'agent' },
                  { label: 'Client', field: 'client' },
                  { label: 'Task', field: 'task' },
                ].map(({ label, field }) => (
                  <div key={field} className="flex items-center border-b border-gray-100 pb-2.5">
                    <span className="w-24 text-gray-400 text-xs shrink-0">{label}</span>
                    {editing ? (
                      <input
                        className="input-field text-xs py-1.5"
                        value={(form as any)[field] ?? ''}
                        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      />
                    ) : (
                      <span className="text-gray-700 font-medium">{(inquiry as any)[field]}</span>
                    )}
                  </div>
                ))}

                {/* Priority */}
                <div className="flex items-center border-b border-gray-100 pb-2.5">
                  <span className="w-24 text-gray-400 text-xs shrink-0">Priority</span>
                  {editing ? (
                    <select className="input-field text-xs py-1.5" value={form.priority ?? ''} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                      {PRIORITY_OPTS.map(o => <option key={o} value={o}>{o.charAt(0)+o.slice(1).toLowerCase()}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-700 font-medium">{inquiry.priority.charAt(0)+inquiry.priority.slice(1).toLowerCase()}</span>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center border-b border-gray-100 pb-2.5">
                  <span className="w-24 text-gray-400 text-xs shrink-0">Status</span>
                  {editing && isAdmin ? (
                    <select className="input-field text-xs py-1.5" value={form.status ?? ''} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {STATUS_OPTS.map(o => <option key={o} value={o}>{STATUS_LABELS[o]}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-700 font-medium">{STATUS_LABELS[inquiry.status]}</span>
                  )}
                </div>

                {/* Src Path */}
                <div className="flex items-center">
                  <span className="w-24 text-gray-400 text-xs shrink-0">Src Path</span>
                  {editing ? (
                    <input
                      className="input-field text-xs py-1.5"
                      placeholder="K:\Folder\Path..."
                      value={form.srcPath ?? ''}
                      onChange={e => setForm(p => ({ ...p, srcPath: e.target.value }))}
                    />
                  ) : inquiry.srcPath ? (
                    <a
                      href={buildFolderUrl(inquiry.srcPath)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-xs group"
                      title={inquiry.srcPath}
                    >
                      <Folder size={14} className="text-gray-400 group-hover:text-[#F5C518] transition-colors" />
                      <span className="truncate max-w-[160px]">{inquiry.srcPath}</span>
                    </a>
                  ) : <span className="text-gray-300 text-xs">Not set</span>}
                </div>
              </div>

              {/* Job Details Box */}
              <div className="mt-4 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 bg-gray-50 space-y-1.5">
                {inquiry.jobRef && <p className="font-semibold text-gray-700 mb-2">{inquiry.jobRef}</p>}
                {editing ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Product', field: 'product' }, { label: 'Finished Size', field: 'finishedSize' },
                      { label: 'Quantity', field: 'quantity' }, { label: 'Material/Stock', field: 'material' },
                      { label: 'Printing', field: 'printing' }, { label: 'Lamination', field: 'lamination' },
                      { label: 'Add-Ons', field: 'addOns' }, { label: 'Turnaround Time', field: 'turnaroundTime' },
                      { label: 'Job Ref', field: 'jobRef' },
                    ].map(({ label, field }) => (
                      <div key={field}>
                        <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                        <input className="input-field py-1 text-xs" value={(form as any)[field] ?? ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      ['Product', inquiry.product], ['Finished Size', inquiry.finishedSize],
                      ['Quantity', inquiry.quantity], ['Material/Stock', inquiry.material],
                      ['Printing', inquiry.printing], ['Lamination', inquiry.lamination],
                      ['Add-Ons', inquiry.addOns], ['Turnaround Time', inquiry.turnaroundTime],
                    ].map(([k, v]) => v ? (
                      <p key={k}><span className="text-gray-400">{k}</span>{'  '}<span className="text-gray-700">{v}</span></p>
                    ) : null)}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-5 flex-wrap">
                {(isAdmin || isOwner) && (
                  <>
                    {editing ? (
                      <>
                        <button onClick={handleSave} className="ghost-btn flex items-center gap-1.5 text-xs">
                          <Save size={13} /> Save
                        </button>
                        <button onClick={() => { setEditing(false); setForm(inquiry) }} className="ghost-btn text-xs">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setEditing(true)} className="ghost-btn flex items-center gap-1.5 text-xs">
                        <Pencil size={13} /> Edit
                      </button>
                    )}
                    <button onClick={handleDelete} className="danger-btn flex items-center gap-1.5 text-xs">
                      <Trash2 size={13} /> Delete
                    </button>
                    {!editing && (
                      <button onClick={handleSave} className="ghost-btn text-xs flex items-center gap-1.5">
                        <Save size={13} /> Save
                      </button>
                    )}
                  </>
                )}
                <button onClick={handlePrintReady} className="brand-btn flex items-center gap-1.5 text-xs ml-auto">
                  <Printer size={13} /> Print Ready
                </button>
              </div>
            </div>

            {/* RIGHT PANEL — Instructions / Changes */}
            <div className="w-80 flex flex-col bg-gray-50/50">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 border border-[#F5C518] rounded-lg px-3 py-2 text-center bg-[#FFF9E5]">
                  Instructions / Changes
                </h2>
              </div>

              {/* Notes list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(inquiry.notes ?? []).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">No notes yet</p>
                )}
                {(inquiry.notes ?? []).map(note => (
                  <div key={note.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <div className="inline-block bg-[#F5C518] text-black text-[10px] font-semibold px-2 py-0.5 rounded mb-2">
                      {formatNoteDate(note.createdAt)} — {note.author.name.split(' ')[0]}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>

              {/* Add Note */}
              <div className="p-4 border-t border-gray-100">
                <textarea
                  className="input-field text-xs resize-none"
                  rows={3}
                  placeholder="Add a note or instruction..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddNote() }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !noteText.trim()}
                  className="brand-btn w-full mt-2 text-xs disabled:opacity-50"
                >
                  {addingNote ? 'Adding...' : 'ADD'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
