'use client'
// components/AddInquiryModal.tsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'

interface User { id: string; name: string }
interface Props { open: boolean; onClose: () => void; onAdded: () => void }

const TASKS = ['Digital Proof', 'Print Ready', 'Mock Up', '3D Design', 'Dieline', 'Revision', 'Other']
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

export default function AddInquiryModal({ open, onClose, onAdded }: Props) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    company: '', agent: '', client: '', task: 'Digital Proof', priority: 'NORMAL',
    srcPath: '', designerId: '',
    product: '', finishedSize: '', quantity: '', material: '', printing: '',
    lamination: '', addOns: '', turnaroundTime: '', jobRef: '',
  })

  useEffect(() => {
    if (open && session?.user?.role === 'ADMIN') {
      fetch('/api/users').then(r => r.json()).then(d => setUsers(d as any))
    }
  }, [open, session])

  function setField(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company || !form.client || !form.task) {
      return toast.error('Company, Client, and Task are required')
    }
    
    const toastId = toast.loading('Adding inquiry...')
    onClose() // Optimistically close the modal immediately
    
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, designerId: form.designerId || undefined }),
      })
      if (res.ok) {
        toast.success('Inquiry added!', { id: toastId })
        setForm({ company: '', agent: '', client: '', task: 'Digital Proof', priority: 'NORMAL', srcPath: '', designerId: '', product: '', finishedSize: '', quantity: '', material: '', printing: '', lamination: '', addOns: '', turnaroundTime: '', jobRef: '' })
        onAdded()
      } else {
        const err: any = await res.json(); toast.error(err.error || 'Failed', { id: toastId })
      }
    } catch {
      toast.error('Network Error', { id: toastId })
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-800">New Inquiry</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Company *</label>
              <input className="input-field" placeholder="OXO Packaging" value={form.company} onChange={e => setField('company', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Agent</label>
              <input className="input-field" placeholder="Mark Wills" value={form.agent} onChange={e => setField('agent', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Client *</label>
              <input className="input-field" placeholder="Client name" value={form.client} onChange={e => setField('client', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Task *</label>
              <select className="input-field" value={form.task} onChange={e => setField('task', e.target.value)}>
                {TASKS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Priority</label>
              <select className="input-field" value={form.priority} onChange={e => setField('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0)+p.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Src Path</label>
              <input className="input-field" placeholder="K:\Folder\Path" value={form.srcPath} onChange={e => setField('srcPath', e.target.value)} />
            </div>
            {session?.user?.role === 'ADMIN' && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Assign to Designer</label>
                <select className="input-field" value={form.designerId} onChange={e => setField('designerId', e.target.value)}>
                  <option value="">— Self (me) —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Job Details</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Product', field: 'product', placeholder: 'Custom Magnetic Boxes' },
                { label: 'Finished Size', field: 'finishedSize', placeholder: '12 x 14 x 2.75 Inches' },
                { label: 'Quantity', field: 'quantity', placeholder: '75 Boxes' },
                { label: 'Material/Stock', field: 'material', placeholder: 'Rigid Boxes' },
                { label: 'Printing', field: 'printing', placeholder: '2 color (Outside)...' },
                { label: 'Lamination', field: 'lamination', placeholder: 'Matte' },
                { label: 'Add-Ons', field: 'addOns', placeholder: 'Embossed Logo' },
                { label: 'Turnaround Time', field: 'turnaroundTime', placeholder: 'Standard' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">{label}</label>
                  <input className="input-field" placeholder={placeholder} value={(form as any)[field]} onChange={e => setField(field, e.target.value)} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Job Reference</label>
                <input className="input-field" placeholder="JOB + OXO-HL-1771526228" value={form.jobRef} onChange={e => setField('jobRef', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="ghost-btn flex-1 rounded-full">Cancel</button>
            <button type="submit" className="bg-[#F5C518] hover:bg-[#D4A800] text-black font-semibold text-sm px-8 py-2.5 rounded-full transition-all shadow-sm cursor-pointer flex-1">
              Add Inquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
