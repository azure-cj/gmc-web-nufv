import Fastify from 'fastify'
import { env } from './infra/config/env'

async function buildServer() {
  const loggerOptions = env.NODE_ENV === 'production' ? { level: 'info' } : { level: 'debug' }
  const server = Fastify({ logger: loggerOptions })

  server.get('/health', async (request, reply) => {
    return { status: 'ok' }
  })

  // Further route registrations (auth, requests, files) go here

  return server
}

async function start() {
  try {
    const server = await buildServer()
    const port = Number(env.PORT || 3001)
    await server.listen({ port, host: '0.0.0.0' })
    server.log.info({ port }, 'Server started')
  } catch (err) {
    // Fastify's logger handles structured logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (console as any).error(err)
    process.exit(1)
  }
}

void start()
