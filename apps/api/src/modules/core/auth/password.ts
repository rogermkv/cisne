import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const COST = 16_384
const BLOCK_SIZE = 8
const PARALLELIZATION = 1

const deriveKey = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    )
  })

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)

  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltValue, keyValue] =
    encodedHash.split('$')

  if (
    algorithm !== 'scrypt' ||
    Number(cost) !== COST ||
    Number(blockSize) !== BLOCK_SIZE ||
    Number(parallelization) !== PARALLELIZATION ||
    !saltValue ||
    !keyValue
  ) {
    return false
  }

  const expectedKey = Buffer.from(keyValue, 'base64url')
  const actualKey = await deriveKey(password, Buffer.from(saltValue, 'base64url'))

  return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey)
}
