// app/api/inquiries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      designer: { select: { id: true, name: true } },
      assignedBy: { select: { id: true, name: true } },
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Normal users can only see their own
  if (session.user.role !== 'ADMIN' && inquiry.designerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(inquiry)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const inquiry = await prisma.inquiry.findUnique({ where: { id } })
  if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.user.role !== 'ADMIN' && inquiry.designerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Auto-increment modifications if status changes
  const modificationsBump =
    body.status && body.status !== inquiry.status ? {} : {}

  const updated = await prisma.inquiry.update({
    where: { id },
    data: {
      company: body.company ?? undefined,
      agent: body.agent ?? undefined,
      client: body.client ?? undefined,
      task: body.task ?? undefined,
      priority: body.priority ?? undefined,
      status: body.status ?? undefined,
      srcPath: body.srcPath ?? undefined,
      product: body.product ?? undefined,
      finishedSize: body.finishedSize ?? undefined,
      quantity: body.quantity ?? undefined,
      material: body.material ?? undefined,
      printing: body.printing ?? undefined,
      lamination: body.lamination ?? undefined,
      addOns: body.addOns ?? undefined,
      turnaroundTime: body.turnaroundTime ?? undefined,
      jobRef: body.jobRef ?? undefined,
      designerId: body.designerId ?? undefined,
      modifications: body.modifications ?? undefined,
    },
    include: {
      designer: { select: { id: true, name: true } },
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const inquiry = await prisma.inquiry.findUnique({ where: { id } })
  if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.user.role !== 'ADMIN' && inquiry.designerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.inquiry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
