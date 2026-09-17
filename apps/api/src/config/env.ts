import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'

config({
  path: fileURLToPath(new URL('../../../../.env', import.meta.url)),
  quiet: true,
})

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 3333)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT deve ser uma porta válida entre 1 e 65535.')
  }

  return port
}

const requireSecret = (value: string | undefined): string => {
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.')
  }

  return value
}

export const env = {
  host: process.env.API_HOST ?? '0.0.0.0',
  port: parsePort(process.env.API_PORT),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: requireSecret(process.env.JWT_SECRET),
}
