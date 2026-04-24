// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const updateData: any = {}
  if (body.name) updateData.name = body.name
  if (body.email) updateData.email = body.email
  if (body.role) updateData.role = body.role
  if (body.teamGroupId !== undefined) updateData.teamGroupId = body.teamGroupId || null
  if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive
  if (body.password) updateData.password = await bcrypt.hash(body.password, 12)

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      teamGroup: { select: { id: true, name: true, color: true } },
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Don't delete if it's the last admin
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } })

  if (user?.role === 'ADMIN' && adminCount <= 1) {
    return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
