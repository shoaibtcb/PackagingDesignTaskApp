'use client'
// components/Logo.tsx
export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={`flex flex-col ${size === 'sm' ? 'gap-0' : 'gap-0.5'}`}>
      <div className="flex items-center gap-2">
        <svg width={size === 'sm' ? 28 : 36} height={size === 'sm' ? 28 : 36} viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="8" fill="#F5C518" opacity="0.15"/>
          <path d="M8 10h20v3H8zM8 16h14v3H8zM8 22h20v3H8z" fill="#F5C518"/>
          <circle cx="26" cy="22" r="4" fill="#1a1a1a"/>
          <path d="M24.5 22l1 1.5 2-2.5" stroke="#F5C518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={`font-bold tracking-tight ${size === 'sm' ? 'text-base' : 'text-lg'}`}>Packaging</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-px w-10 bg-gray-300"/>
        <span className="text-[10px] text-gray-400 italic">Design Task App</span>
        <div className="h-px w-10 bg-gray-300"/>
      </div>
    </div>
  )
}
