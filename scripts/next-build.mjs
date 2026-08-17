import { spawnSync } from 'node:child_process'
import path from 'node:path'

const env = {
  ...process.env,
  NEXT_SWC_PATH: process.env.NEXT_SWC_PATH || path.join(process.cwd(), '.next', 'next-swc'),
}

const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  env,
  shell: true,
})

process.exit(result.status ?? 1)
