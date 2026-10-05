export type MediaView = { id: string; url: string; mimeType: string; width: number | null; height: number | null }

export function mediaView(asset: any): MediaView | null {
  if (!asset || asset.deletedAt) return null
  return { id: asset.id, url: `/api/media/${encodeURIComponent(asset.id)}`, mimeType: asset.mimeType, width: asset.width ?? null, height: asset.height ?? null }
}
