import path from 'node:path'

export const personPhotosDirectory =
  process.env.PERSON_PHOTOS_DIR ||
  path.resolve(process.cwd(), 'uploads', 'person-photos')

export const personPhotoPath = (file: string) =>
  path.join(personPhotosDirectory, file)

export const spacePhotosDirectory =
  process.env.SPACE_PHOTOS_DIR ||
  path.resolve(process.cwd(), 'uploads', 'space-photos')

export const spacePhotoPath = (file: string) =>
  path.join(spacePhotosDirectory, file)
