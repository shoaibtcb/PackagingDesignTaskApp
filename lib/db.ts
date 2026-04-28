// lib/db.ts
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

let cachedPrisma: PrismaClient | null = null;

export function getPrisma() {
  if (process.env.NODE_ENV === 'development') {
    if (!cachedPrisma) cachedPrisma = new PrismaClient()
    return cachedPrisma
  }

  try {
    const { getRequestContext } = require('@cloudflare/next-on-pages')
    const ctx = getRequestContext()
    if (ctx?.env?.DB) {
      const adapter = new PrismaD1(ctx.env.DB)
      return new PrismaClient({ adapter })
    }
  } catch (e) {
    // Fallback if not running inside Cloudflare runtime
  }

  if (!cachedPrisma) cachedPrisma = new PrismaClient()
  return cachedPrisma
}

export default getPrisma()
