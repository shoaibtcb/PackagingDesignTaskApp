export const runtime = 'edge';
// app/api/groups/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const group = await prisma.teamGroup.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      color: body.color ?? undefined,
      sortOrder: body.sortOrder ?? undefined,
    },
  })

  return NextResponse.json(group)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Move users out of this group before deleting
  await prisma.user.updateMany({
    where: { teamGroupId: id },
    data: { teamGroupId: null },
  })

  await prisma.teamGroup.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
