'use client'
// app/(dashboard)/admin/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Users, Layers, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface TeamGroup { id: string; name: string; color: string; sortOrder: number }
interface User {
  id: string; name: string; email: string; role: string; isActive: boolean
  teamGroup?: { id: string; name: string; color: string } | null
  _count?: { inquiries: number }
}

type Tab = 'users' | 'groups'

export default function AdminPage() {
  const { data: session, status } = useSession({ required: true })
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<TeamGroup[]>([])
  const [loading, setLoading] = useState(false)

  // User modal state
  const [showUserModal, setShowUserModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'USER', teamGroupId: '', isActive: true })

  // Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editGroup, setEditGroup] = useState<TeamGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', color: '#F5C518' })

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, gRes] = await Promise.all([fetch('/api/users'), fetch('/api/groups')])
      const [u, g] = await Promise.all([uRes.json(), gRes.json()])
      setUsers(Array.isArray(u) ? u : [])
      setGroups(Array.isArray(g) ? g : [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ----- User CRUD -----
  function openAddUser() {
    setEditUser(null)
    setUserForm({ name: '', email: '', password: '', role: 'USER', teamGroupId: '', isActive: true })
    setShowUserModal(true)
  }
  function openEditUser(u: User) {
    setEditUser(u)
    setUserForm({ name: u.name, email: u.email, password: '', role: u.role, teamGroupId: u.teamGroup?.id ?? '', isActive: u.isActive })
    setShowUserModal(true)
  }

  async function handleSaveUser() {
    const toastId = toast.loading(editUser ? 'Updating...' : 'Creating...')
    try {
      let res: Response
      if (editUser) {
        const body: any = { name: userForm.name, email: userForm.email, role: userForm.role, teamGroupId: userForm.teamGroupId || null, isActive: userForm.isActive }
        if (userForm.password) body.password = userForm.password
        res = await fetch(`/api/users/${editUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        if (!userForm.password) return toast.error('Password required', { id: toastId })
        res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) })
      }
      if (res.ok) {
        toast.success(editUser ? 'User updated!' : 'User created!', { id: toastId })
        setShowUserModal(false); fetchData()
      } else {
        const err: any = await res.json(); toast.error(err.error || 'Failed', { id: toastId })
      }
    } catch { toast.error('Error', { id: toastId }) }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Delete this user?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); fetchData() }
    else { const e = await res.json(); toast.error(e.error || 'Failed') }
  }

  // ----- Group CRUD -----
  function openAddGroup() {
    setEditGroup(null); setGroupForm({ name: '', color: '#F5C518' }); setShowGroupModal(true)
  }
  function openEditGroup(g: TeamGroup) {
    setEditGroup(g); setGroupForm({ name: g.name, color: g.color }); setShowGroupModal(true)
  }

  async function handleSaveGroup() {
    const toastId = toast.loading(editGroup ? 'Updating...' : 'Creating...')
    try {
      let res: Response
      if (editGroup) {
        res = await fetch(`/api/groups/${editGroup.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupForm) })
      } else {
        res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupForm) })
      }
      if (res.ok) { toast.success('Saved!', { id: toastId }); setShowGroupModal(false); fetchData() }
      else { const err: any = await res.json(); toast.error(err.error || 'Failed', { id: toastId }) }
    } catch { toast.error('Error', { id: toastId }) }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm('Delete this group? Users will be unassigned.')) return
    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Group deleted'); fetchData() }
    else toast.error('Failed')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <span className="text-gray-200">|</span>
        <h1 className="text-base font-bold text-gray-800">Admin Panel</h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Protocol Setup Card */}
        <div className="card p-5 border-l-4 border-[#F5C518]">
          <h3 className="font-semibold text-sm text-gray-800 mb-1">🗂️ Folder Protocol Setup</h3>
          <p className="text-xs text-gray-500 mb-3">
            Each Windows machine needs a one-time setup to enable folder opening. Download and run the setup files:
          </p>
          <div className="flex gap-3">
            <a
              href="/api/download/reg"
              className="ghost-btn text-xs py-1.5"
            >
              ⬇ Download setup.reg
            </a>
            <a
              href="/api/download/bat"
              className="ghost-btn text-xs py-1.5"
            >
              ⬇ Download open-folder.bat
            </a>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Run <code className="bg-gray-100 px-1 rounded">setup.reg</code> as Administrator, then place <code className="bg-gray-100 px-1 rounded">open-folder.bat</code> in <code className="bg-gray-100 px-1 rounded">C:\design-task-helper\</code>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm w-fit">
          {([['users', 'Users', Users], ['groups', 'Team Groups', Layers]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === key ? 'bg-[#F5C518] text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Users ({users.length})</h2>
              <button onClick={openAddUser} className="brand-btn flex items-center gap-1.5 text-xs">
                <Plus size={13} /> Add User
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Name', 'Email', 'Role', 'Group', 'Inquiries', 'Active', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading...</td></tr>
                  )}
                  {!loading && users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.role === 'ADMIN' ? 'bg-[#FFF3CC] text-[#D4A800]' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.teamGroup?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{u._count?.inquiries ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block w-2 h-2 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEditUser(u)} className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors cursor-pointer">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors cursor-pointer">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {tab === 'groups' && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Team Groups ({groups.length})</h2>
              <button onClick={openAddGroup} className="brand-btn flex items-center gap-1.5 text-xs">
                <Plus size={13} /> Add Group
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {groups.map(g => (
                <div key={g.id} className="rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-sm transition-shadow bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: g.color }} />
                    <span className="text-sm font-medium text-gray-700">{g.name}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEditGroup(g)} className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors cursor-pointer">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDeleteGroup(g.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-800">{editUser ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => setShowUserModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"><X size={15} /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Full Name', field: 'name', type: 'text', placeholder: 'Muhammad Shoaib' },
                { label: 'Email', field: 'email', type: 'email', placeholder: 'user@email.com' },
                { label: editUser ? 'New Password (leave blank to keep)' : 'Password', field: 'password', type: 'password', placeholder: '••••••••' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                  <input
                    type={type} placeholder={placeholder} className="input-field text-sm"
                    value={(userForm as any)[field]}
                    onChange={e => setUserForm(p => ({ ...p, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Role</label>
                <select className="input-field text-sm" value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="USER">Designer (User)</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Team Group</label>
                <select className="input-field text-sm" value={userForm.teamGroupId} onChange={e => setUserForm(p => ({ ...p, teamGroupId: e.target.value }))}>
                  <option value="">— No Group —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              {editUser && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={userForm.isActive} onChange={e => setUserForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-[#F5C518]" />
                  <span className="text-sm text-gray-600">Active</span>
                </label>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowUserModal(false)} className="ghost-btn flex-1">Cancel</button>
              <button onClick={handleSaveUser} className="brand-btn flex-1">{editUser ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-800">{editGroup ? 'Edit Group' : 'Add Group'}</h3>
              <button onClick={() => setShowGroupModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Group Name</label>
                <input className="input-field" placeholder="Design Team" value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={groupForm.color} onChange={e => setGroupForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                  <input className="input-field" value={groupForm.color} onChange={e => setGroupForm(p => ({ ...p, color: e.target.value }))} placeholder="#F5C518" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowGroupModal(false)} className="ghost-btn flex-1">Cancel</button>
              <button onClick={handleSaveGroup} className="brand-btn flex-1">{editGroup ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
