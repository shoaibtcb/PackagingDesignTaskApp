// app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'

export async function GET() {
  const prisma = getPrisma();
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await prisma.teamGroup.findMany({
    include: {
      users: {
        where: { isActive: true },
        select: { id: true, name: true, role: true, email: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const maxOrder = await prisma.teamGroup.aggregate({ _max: { sortOrder: true } })
  const group = await prisma.teamGroup.create({
    data: { name, color: color || '#F5C518', sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  })

  return NextResponse.json(group, { status: 201 })
}
