// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default team groups
  const designTeam = await prisma.teamGroup.upsert({
    where: { name: 'Design Team' },
    update: {},
    create: { name: 'Design Team', color: '#F5C518', sortOrder: 0 },
  })

  const oxoPackaging = await prisma.teamGroup.upsert({
    where: { name: 'OXO-Packaging' },
    update: {},
    create: { name: 'OXO-Packaging', color: '#F5C518', sortOrder: 1 },
  })

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@packaging.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@packaging.com',
      password: adminPassword,
      role: Role.ADMIN,
      teamGroupId: designTeam.id,
    },
  })

  // Create sample designer
  const designerPassword = await bcrypt.hash('designer123', 12)
  await prisma.user.upsert({
    where: { email: 'shoaib@packaging.com' },
    update: {},
    create: {
      name: 'Muhammad Shoaib',
      email: 'shoaib@packaging.com',
      password: designerPassword,
      role: Role.USER,
      teamGroupId: designTeam.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'murtaza@packaging.com' },
    update: {},
    create: {
      name: 'Syed Murtaza Kirmani',
      email: 'murtaza@packaging.com',
      password: designerPassword,
      role: Role.USER,
      teamGroupId: designTeam.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'brian@packaging.com' },
    update: {},
    create: {
      name: 'Brian Jackson',
      email: 'brian@packaging.com',
      password: designerPassword,
      role: Role.USER,
      teamGroupId: oxoPackaging.id,
    },
  })

  console.log('✅ Seed complete!')
  console.log('📧 Admin: admin@packaging.com / admin123')
  console.log('📧 Designer: shoaib@packaging.com / designer123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
