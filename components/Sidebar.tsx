'use client'
// components/Sidebar.tsx
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import Logo from './Logo'
import { ChevronDown, LogOut, Circle, Settings } from 'lucide-react'
import Link from 'next/link'

interface User { id: string; name: string; role: string; email: string }
interface Group { id: string; name: string; color: string; users: User[] }

interface Props {
  onFilterDesigner?: (id: string | null) => void
  activeDesigner?: string | null
}

export default function Sidebar({ onFilterDesigner, activeDesigner }: Props) {
  const { data: session } = useSession()
  const [groups, setGroups] = useState<Group[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d as any))
  }, [])

  function toggleGroup(id: string) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col shadow-sm shrink-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <Logo size="sm" />
      </div>

      {/* Groups + Users */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* All users filter */}
        <button
          onClick={() => onFilterDesigner?.(null)}
          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeDesigner === null
              ? 'bg-[#FFF3CC] text-[#D4A800]'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Inquiries
        </button>

        {groups.map(group => (
          <div key={group.id}>
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <ChevronDown
                  size={12}
                  className={`text-[#F5C518] transition-transform duration-200 ${
                    collapsed[group.id] ? '-rotate-90' : ''
                  }`}
                />
                <span className="text-xs font-semibold text-gray-700">{group.name}</span>
              </div>
            </button>

            {!collapsed[group.id] && (
              <div className="ml-4 space-y-0.5 mt-0.5">
                {group.users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => onFilterDesigner?.(user.id)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      activeDesigner === user.id
                        ? 'bg-[#FFF3CC] text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Circle
                      size={6}
                      className={
                        user.role === 'ADMIN' ? 'fill-[#F5C518] text-[#F5C518]' : 'fill-gray-300 text-gray-300'
                      }
                    />
                    <span className={user.role === 'ADMIN' ? 'font-medium' : ''}>
                      {user.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom: user info + logout */}
      <div className="px-4 py-4 border-t border-gray-100 space-y-2">
        {session?.user.role === 'ADMIN' && (
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Settings size={13} />
            Admin Panel
          </Link>
        )}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <div>
            <p className="text-xs font-medium text-gray-700 truncate max-w-[110px]">{session?.user?.name}</p>
            <p className="text-[10px] text-gray-400 capitalize">{session?.user?.role?.toLowerCase()}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
