import type { PrismaClient } from '@prisma/client'

export async function generateCertificateNumber(prisma: PrismaClient): Promise<string> {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const count = await prisma.certificate.count({
      where: {
        issuedAt: {
          gte: monthStart,
          lt: monthEnd
        }
      }
    })

    const seq = String(count + 1).padStart(6, '0')
    const certNumber = `${year}-${month}-${seq}`
    return certNumber
  } catch (err) {
    throw err
  }
}
