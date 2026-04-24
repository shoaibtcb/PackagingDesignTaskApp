// app/(dashboard)/layout.tsx
import SessionProviderWrapper from '@/components/SessionProviderWrapper'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProviderWrapper>
      {children}
    </SessionProviderWrapper>
  )
}
