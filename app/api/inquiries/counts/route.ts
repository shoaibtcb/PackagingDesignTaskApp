export const runtime = 'edge';
// app/api/inquiries/counts/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'

export async function GET() {
  const prisma = getPrisma();
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = session.user.role === 'ADMIN' ? {} : { designerId: session.user.id }

  const [pending, inProcess, complete, production] = await Promise.all([
    prisma.inquiry.count({ where: { ...where, status: 'PENDING' } }),
    prisma.inquiry.count({ where: { ...where, status: 'IN_PROCESS' } }),
    prisma.inquiry.count({ where: { ...where, status: 'COMPLETE' } }),
    prisma.inquiry.count({ where: { ...where, status: 'PRODUCTION' } }),
  ])

  return NextResponse.json({ pending, inProcess, complete, production })
}
