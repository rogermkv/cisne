CREATE TABLE "space_photos" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "space_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "space_photos_spaceId_sortOrder_idx" ON "space_photos"("spaceId", "sortOrder");
ALTER TABLE "space_photos" ADD CONSTRAINT "space_photos_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "reservable_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
