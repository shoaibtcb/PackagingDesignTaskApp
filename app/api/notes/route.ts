export const runtime = 'edge';
// app/api/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inquiryId, content: reqContent }: any = await req.json()

  if (!inquiryId || !reqContent?.trim()) {
    return NextResponse.json({ error: 'inquiryId and content required' }, { status: 400 })
  }

  // Bump modification count on inquiry
  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { modifications: { increment: 1 } },
  })

  const note = await prisma.note.create({
    data: {
      content: reqContent,
      inquiryId,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(note, { status: 201 })
}
