// lib/db.ts
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

import { getRequestContext } from '@cloudflare/next-on-pages'

let cachedPrisma: PrismaClient | null = null;

export function getPrisma() {
  if (process.env.NODE_ENV === 'development') {
    if (!cachedPrisma) cachedPrisma = new PrismaClient()
    return cachedPrisma
  }

  // Production (Cloudflare Edge)
  const ctx = getRequestContext()
  if ((ctx?.env as any)?.DB) {
    const adapter = new PrismaD1((ctx.env as any).DB)
    return new PrismaClient({ adapter })
  }

  throw new Error('D1 Database binding not found. Please bind your D1 database to the variable "DB".')
}

