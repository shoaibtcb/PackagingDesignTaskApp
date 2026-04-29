export const runtime = 'edge';
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const prisma = getPrisma();
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      teamGroup: { select: { id: true, name: true, color: true } },
      _count: { select: { inquiries: true } },
    },
    orderBy: [{ teamGroup: { sortOrder: 'asc' } }, { name: 'asc' }],
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role, teamGroupId } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, password required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role || 'USER',
      teamGroupId: teamGroupId || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      teamGroup: { select: { id: true, name: true, color: true } },
    },
  })

  return NextResponse.json(user, { status: 201 })
}
