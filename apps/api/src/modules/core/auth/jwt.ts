import { createHmac, timingSafeEqual } from 'node:crypto'

type JwtPayload = {
  sub: string
  iat: number
  exp: number
}

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')

const sign = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value).digest('base64url')

export function createAccessToken(userId: string, secret: string): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload: JwtPayload = {
    sub: userId,
    iat: issuedAt,
    exp: issuedAt + 8 * 60 * 60,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const content = `${header}.${encodedPayload}`

  return `${content}.${sign(content, secret)}`
}

export function verifyAccessToken(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.')

  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, signature] = parts
  const content = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = Buffer.from(sign(content, secret))
  const actualSignature = Buffer.from(signature)

  if (
    encodedHeader !== header ||
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as JwtPayload
    const now = Math.floor(Date.now() / 1000)

    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.iat > now + 60 ||
      payload.exp <= now
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
