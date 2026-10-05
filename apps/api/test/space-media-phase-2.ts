import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { prepareSpaceImage, inspectHistoricalImage, MAX_SPACE_IMAGE_DIMENSION } from '../src/modules/media/image-processing.js'

const hash = (bytes: Uint8Array) => crypto.createHash('sha256').update(bytes).digest('hex')

const main = async () => {
  const source = await sharp({
    create: { width: 3200, height: 1200, channels: 4, background: { r: 40, g: 100, b: 180, alpha: 0.5 } },
  }).png().withMetadata({ orientation: 6 }).toBuffer()

  const jpeg = await prepareSpaceImage(source, 'image/png')
  assert.equal(jpeg.mimeType, 'image/png')
  assert.ok(jpeg.width <= MAX_SPACE_IMAGE_DIMENSION)
  assert.ok(jpeg.height <= MAX_SPACE_IMAGE_DIMENSION)
  assert.notEqual(hash(jpeg.bytes), hash(source), 'novo upload deve ser reencodado')
  const jpegMetadata = await sharp(jpeg.bytes).metadata()
  assert.equal(jpegMetadata.orientation, undefined, 'metadados EXIF devem ser removidos')

  const encoded = {
    'image/jpeg': await sharp({ create: { width: 40, height: 20, channels: 3, background: 'red' } }).jpeg().toBuffer(),
    'image/png': await sharp({ create: { width: 40, height: 20, channels: 4, background: 'red' } }).png().toBuffer(),
    'image/webp': await sharp({ create: { width: 40, height: 20, channels: 4, background: 'red' } }).webp().toBuffer(),
  } as const
  for (const mime of ['image/jpeg', 'image/png', 'image/webp'] as const) {
    const prepared = await prepareSpaceImage(encoded[mime], mime)
    assert.equal(prepared.mimeType, mime)
    assert.equal(prepared.width, 40)
    assert.equal(prepared.height, 20)
  }

  const tiny = await sharp({ create: { width: 1, height: 1, channels: 4, background: 'transparent' } }).png().toBuffer()
  const tinyResult = await prepareSpaceImage(tiny, 'image/png')
  assert.equal(tinyResult.width, 1, 'imagem pequena não deve ser ampliada')
  assert.equal(tinyResult.height, 1)

  await assert.rejects(() => prepareSpaceImage(Buffer.from('not-an-image'), 'image/jpeg'), /imagem|MIME|inválido|unsupported/i)
  await assert.rejects(() => prepareSpaceImage(tiny, 'image/jpeg'), /conteúdo|MIME/i)

  const historical = await inspectHistoricalImage(source)
  assert.equal(historical.mimeType, 'image/png')
  assert.equal(hash(source), hash(source), 'migração histórica deve preservar bytes exatamente')
}

main().catch(error => { console.error(error); process.exitCode = 1 })
