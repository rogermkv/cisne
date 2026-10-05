CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "MediaPurpose" AS ENUM ('MEMBER_PHOTO', 'SPACE_PHOTO', 'ANNOUNCEMENT_IMAGE', 'EVENT_IMAGE', 'ATTACHMENT');

CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "checksumSha256" TEXT NOT NULL,
    "visibility" "MediaVisibility" NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_assets_storageKey_key" ON "media_assets"("storageKey");
CREATE INDEX "media_assets_checksumSha256_idx" ON "media_assets"("checksumSha256");
CREATE INDEX "media_assets_visibility_purpose_idx" ON "media_assets"("visibility", "purpose");
CREATE INDEX "media_assets_deletedAt_idx" ON "media_assets"("deletedAt");
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "persons" ADD COLUMN "photoAssetId" TEXT;
ALTER TABLE "space_photos" ADD COLUMN "mediaAssetId" TEXT;
ALTER TABLE "announcements" ADD COLUMN "imageAssetId" TEXT;
ALTER TABLE "club_events" ADD COLUMN "imageAssetId" TEXT;

CREATE UNIQUE INDEX "persons_photoAssetId_key" ON "persons"("photoAssetId");
CREATE UNIQUE INDEX "space_photos_mediaAssetId_key" ON "space_photos"("mediaAssetId");
CREATE UNIQUE INDEX "announcements_imageAssetId_key" ON "announcements"("imageAssetId");
CREATE UNIQUE INDEX "club_events_imageAssetId_key" ON "club_events"("imageAssetId");

ALTER TABLE "persons" ADD CONSTRAINT "persons_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "space_photos" ADD CONSTRAINT "space_photos_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "club_events" ADD CONSTRAINT "club_events_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
