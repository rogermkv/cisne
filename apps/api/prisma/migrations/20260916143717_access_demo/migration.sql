-- CreateEnum
CREATE TYPE "AccessEventType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('QR_CODE', 'CPF_SEARCH', 'MANUAL');

-- CreateTable
CREATE TABLE "access_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_events" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "accessPointId" TEXT NOT NULL,
    "type" "AccessEventType" NOT NULL,
    "method" "AccessMethod" NOT NULL,
    "invitationId" TEXT,
    "registeredByUserId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_points_name_key" ON "access_points"("name");

-- CreateIndex
CREATE INDEX "access_events_occurredAt_idx" ON "access_events"("occurredAt");

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_accessPointId_fkey" FOREIGN KEY ("accessPointId") REFERENCES "access_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "visitor_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
