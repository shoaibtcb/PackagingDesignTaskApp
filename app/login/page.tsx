'use client'
// app/login/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        toast.error('Invalid email or password')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg p-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="relative">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="8" fill="#F5C518" opacity="0.15"/>
                <path d="M8 10h20v3H8zM8 16h14v3H8zM8 22h20v3H8z" fill="#F5C518"/>
                <circle cx="26" cy="22" r="4" fill="#1a1a1a"/>
                <path d="M24.5 22l1 1.5 2-2.5" stroke="#F5C518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">Packaging</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-px w-12 bg-gray-300"/>
            <span className="text-xs text-gray-400 italic">Design Task App</span>
            <div className="h-px w-12 bg-gray-300"/>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-7">
          Let&apos;s Collaborate
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Username</label>
            <input
              id="email"
              type="email"
              placeholder="user@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            className="brand-btn w-full mt-2 text-center disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in to Dashboard'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Design &amp; Developed with ❤️ by MUHAMMAD SHOAIB
        </p>
      </div>
    </div>
  )
}
