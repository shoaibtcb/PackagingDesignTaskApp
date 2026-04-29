export const runtime = 'edge';
// app/api/inquiries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import { generateLeadNumber } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const designerId = searchParams.get('designerId')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}
  if (status) where.status = status
  if (designerId) where.designerId = designerId
  if (search) {
    where.OR = [
      { leadNumber: { contains: search, mode: 'insensitive' } },
      { client: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Normal users can only see their own inquiries
  if (session.user.role !== 'ADMIN') {
    where.designerId = session.user.id
  }

  const [inquiries, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: {
        designer: { select: { id: true, name: true } },
        _count: { select: { notes: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inquiry.count({ where }),
  ])

  return NextResponse.json({ inquiries, total, page, limit })
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: any = await req.json()

  const inquiry = await prisma.inquiry.create({
    data: {
      leadNumber: generateLeadNumber(),
      company: body.company,
      agent: body.agent,
      client: body.client,
      task: body.task,
      priority: body.priority || 'NORMAL',
      srcPath: body.srcPath || null,
      product: body.product || null,
      finishedSize: body.finishedSize || null,
      quantity: body.quantity || null,
      material: body.material || null,
      printing: body.printing || null,
      lamination: body.lamination || null,
      addOns: body.addOns || null,
      turnaroundTime: body.turnaroundTime || null,
      jobRef: body.jobRef || null,
      designerId: body.designerId || session.user.id,
      assignedById: session.user.id,
      status: 'PENDING',
    },
    include: {
      designer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(inquiry, { status: 201 })
}
