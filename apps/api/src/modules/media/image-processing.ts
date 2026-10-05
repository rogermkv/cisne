import sharp from 'sharp'

export const MAX_SPACE_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_SPACE_IMAGE_DIMENSION = 2560
const MAX_INPUT_PIXELS = 2560 * 2560 * 4
export const MAX_MEMBER_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_MEMBER_IMAGE_DIMENSION = 600

export type PreparedImage = { bytes: Buffer; mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; width: number; height: number; extension: 'jpg' | 'png' | 'webp' }

const outputFor = (mimeType: PreparedImage['mimeType'], image: sharp.Sharp) => {
  if (mimeType === 'image/jpeg') return image.jpeg({ quality: 85, progressive: true, mozjpeg: true })
  if (mimeType === 'image/png') return image.png({ compressionLevel: 9, adaptiveFiltering: true })
  return image.webp({ quality: 85 })
}

export async function prepareSpaceImage(input: Uint8Array, requestedMimeType: string): Promise<PreparedImage> {
  if (input.byteLength === 0 || input.byteLength > MAX_SPACE_IMAGE_BYTES) throw new Error('A foto deve ter entre 1 byte e 10 MB.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(requestedMimeType)) throw new Error('Formato inválido. Use JPG, PNG ou WEBP.')
  const image = sharp(Buffer.from(input), { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'warning' })
  const metadata = await image.metadata()
  const detectedMime = metadata.format === 'jpeg' ? 'image/jpeg' : metadata.format === 'png' ? 'image/png' : metadata.format === 'webp' ? 'image/webp' : null
  if (!detectedMime || detectedMime !== requestedMimeType) throw new Error('O conteúdo da imagem não corresponde ao MIME informado.')
  if (!metadata.width || !metadata.height) throw new Error('Não foi possível determinar as dimensões da imagem.')
  const output = outputFor(detectedMime, image.rotate().resize({ width: MAX_SPACE_IMAGE_DIMENSION, height: MAX_SPACE_IMAGE_DIMENSION, fit: 'inside', withoutEnlargement: true }))
  const result = await output.toBuffer({ resolveWithObject: true })
  const width = result.info.width
  const height = result.info.height
  if (!width || !height || width > MAX_SPACE_IMAGE_DIMENSION || height > MAX_SPACE_IMAGE_DIMENSION) throw new Error('As dimensões da imagem excedem o limite permitido.')
  return { bytes: result.data, mimeType: detectedMime, width, height, extension: detectedMime === 'image/jpeg' ? 'jpg' : detectedMime === 'image/png' ? 'png' : 'webp' }
}

export async function inspectHistoricalImage(input: Uint8Array): Promise<{ mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; width: number; height: number }> {
  if (input.byteLength === 0 || input.byteLength > MAX_SPACE_IMAGE_BYTES) throw new Error('Arquivo histórico vazio ou acima do limite de 10 MB.')
  const metadata = await sharp(Buffer.from(input), { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'warning' }).metadata()
  const mimeType = metadata.format === 'jpeg' ? 'image/jpeg' : metadata.format === 'png' ? 'image/png' : metadata.format === 'webp' ? 'image/webp' : null
  if (!mimeType || !metadata.width || !metadata.height) throw new Error('Arquivo histórico não é JPEG, PNG ou WEBP válido.')
  return { mimeType, width: metadata.width, height: metadata.height }
}

export async function prepareMemberImage(input: Uint8Array, requestedMimeType: string): Promise<{ bytes: Buffer; mimeType: 'image/jpeg'; width: number; height: number }> {
  if (input.byteLength === 0 || input.byteLength > MAX_MEMBER_IMAGE_BYTES) throw new Error('A foto deve ter entre 1 byte e 5 MB.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(requestedMimeType)) throw new Error('Formato inválido. Use JPG, PNG ou WEBP.')
  const source = sharp(Buffer.from(input), { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'warning' })
  const metadata = await source.metadata()
  const detected = metadata.format === 'jpeg' ? 'image/jpeg' : metadata.format === 'png' ? 'image/png' : metadata.format === 'webp' ? 'image/webp' : null
  if (detected !== requestedMimeType || !metadata.width || !metadata.height) throw new Error('O conteúdo da imagem não corresponde ao MIME informado.')
  const rotatedWidth = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8 ? metadata.height : metadata.width
  const rotatedHeight = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8 ? metadata.width : metadata.height
  if (rotatedWidth * 4 !== rotatedHeight * 3) throw new Error('A foto deve estar obrigatoriamente na proporção 3:4.')
  const output = await source.rotate().resize({ width: MAX_MEMBER_IMAGE_DIMENSION, height: 800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toBuffer({ resolveWithObject: true })
  if (!output.info.width || !output.info.height || output.info.width * 4 !== output.info.height * 3 || output.info.width > 600 || output.info.height > 800) throw new Error('A foto excede o limite de 600x800.')
  return { bytes: output.data, mimeType: 'image/jpeg', width: output.info.width, height: output.info.height }
}
