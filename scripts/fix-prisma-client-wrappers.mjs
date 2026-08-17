import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pnpmStoreDir = path.join(root, 'node_modules', '.pnpm')

function findPrismaClientPackageDir() {
  if (!fs.existsSync(pnpmStoreDir)) {
    return null
  }

  const entry = fs
    .readdirSync(pnpmStoreDir, { withFileTypes: true })
    .find((dirent) => dirent.isDirectory() && dirent.name.startsWith('@prisma+client@'))

  if (!entry) {
    return null
  }

  return path.join(pnpmStoreDir, entry.name, 'node_modules', '@prisma', 'client')
}

const clientDir = findPrismaClientPackageDir()

if (!clientDir || !fs.existsSync(clientDir)) {
  console.warn('[fix-prisma-client-wrappers] Prisma client package directory not found.')
  process.exit(0)
}

const defaultJsPath = path.join(clientDir, 'default.js')
const defaultDtsPath = path.join(clientDir, 'default.d.ts')

const defaultJs = "module.exports = require('../../.prisma/client/default')\n"
const defaultDts = "export * from '../../.prisma/client/default'\n"

if (!fs.existsSync(defaultJsPath) || fs.readFileSync(defaultJsPath, 'utf8') !== defaultJs) {
  fs.writeFileSync(defaultJsPath, defaultJs, 'utf8')
}

if (!fs.existsSync(defaultDtsPath) || fs.readFileSync(defaultDtsPath, 'utf8') !== defaultDts) {
  fs.writeFileSync(defaultDtsPath, defaultDts, 'utf8')
}

console.log('[fix-prisma-client-wrappers] Prisma client wrappers ensured.')
