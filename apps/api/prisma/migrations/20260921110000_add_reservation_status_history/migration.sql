CREATE TABLE "reservation_status_history" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "fromStatus" "ReservationStatus",
    "toStatus" "ReservationStatus" NOT NULL,
    "changedByUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reservation_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservation_status_history_reservationId_createdAt_idx"
ON "reservation_status_history"("reservationId", "createdAt");

ALTER TABLE "reservation_status_history"
ADD CONSTRAINT "reservation_status_history_reservationId_fkey"
FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservation_status_history"
ADD CONSTRAINT "reservation_status_history_changedByUserId_fkey"
FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
