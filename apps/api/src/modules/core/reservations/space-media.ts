import { mediaView } from '../../media/view.js'

export const spacePhotosWithMedia = { orderBy: { sortOrder: 'asc' as const }, include: { mediaAsset: true } }

export function serializeSpacePhoto(photo: any) {
  const { mediaAsset, ...legacyPhoto } = photo
  const media = mediaView(mediaAsset)
  return { ...legacyPhoto, path: media?.url || legacyPhoto.path, media }
}

export function serializeSpace(space: any) {
  if (!space) return space
  const photos = (space.photos || []).map(serializeSpacePhoto)
  const primary = photos.find((photo: any) => photo.isPrimary && photo.media)
  return { ...space, photos, primaryMedia: primary?.media || null }
}

export function serializeReservation(reservation: any) {
  return reservation?.space ? { ...reservation, space: serializeSpace(reservation.space) } : reservation
}
