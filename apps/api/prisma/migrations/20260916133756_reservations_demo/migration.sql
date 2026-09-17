-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "financial_charges" DROP CONSTRAINT "financial_charges_memberId_fkey";

-- AlterTable
ALTER TABLE "club_settings" ALTER COLUMN "annualFeeAmount" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "reservable_spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "imagePath" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservable_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'REQUESTED',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservable_spaces_name_key" ON "reservable_spaces"("name");

-- CreateIndex
CREATE INDEX "reservations_spaceId_reservationDate_idx" ON "reservations"("spaceId", "reservationDate");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "reservable_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_charges" ADD CONSTRAINT "financial_charges_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
