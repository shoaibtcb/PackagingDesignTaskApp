// lib/utils.ts
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

export function generateLeadNumber(): string {
  return `OXO-JG-${Date.now()}`
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }) + ' ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatNoteDate(date: Date | string): string {
  const d = new Date(date)
  return (
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) +
    ' / ' +
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  )
}

export function buildFolderUrl(path: string): string {
  if (!path) return '#'
  const encoded = encodeURIComponent(path)
  return `design-task://open?path=${encoded}`
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROCESS: 'In-Process',
  COMPLETE: 'Complete',
  PRODUCTION: 'Production',
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-orange-500',
  IN_PROCESS: 'text-blue-500',
  COMPLETE: 'text-green-500',
  PRODUCTION: 'text-purple-500',
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500',
  NORMAL: 'text-gray-700',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-600',
}
