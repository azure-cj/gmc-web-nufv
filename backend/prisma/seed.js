/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Create an initial admin user if none exist
  const existing = await prisma.adminUser.findFirst()
  if (!existing) {
    await prisma.adminUser.create({
      data: {
        email: 'admin@example.com',
        passwordHash: 'change_me',
        name: 'Administrator',
        role: 'admin'
      }
    })
    console.log('Created default admin user: admin@example.com (passwordHash=change_me)')
  } else {
    console.log('Admin user already exists, skipping seed.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
