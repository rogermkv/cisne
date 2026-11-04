ALTER TABLE "financial_charges" ADD COLUMN "reservationId" TEXT;

CREATE UNIQUE INDEX "financial_charges_reservationId_key"
ON "financial_charges"("reservationId");

ALTER TABLE "financial_charges"
ADD CONSTRAINT "financial_charges_reservationId_fkey"
FOREIGN KEY ("reservationId") REFERENCES "reservations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "financial_charges"
  ("id", "memberId", "responsibleMemberId", "type", "description", "referenceYear", "amount", "dueDate", "status", "reservationId", "createdAt", "updatedAt")
SELECT
  'reservation-charge-' || r."id",
  r."memberId",
  CASE WHEN mc."isDependent" OR mc."requiresHolder" THEN m."titularMemberId" ELSE m."id" END,
  'RESERVATION'::"FinancialChargeType",
  'Reserva — ' || s."name" || ' — ' || to_char(r."reservationDate", 'YYYY-MM-DD'),
  EXTRACT(YEAR FROM r."reservationDate")::INTEGER,
  r."totalAmount",
  r."reservationDate",
  'PENDING'::"FinancialChargeStatus",
  r."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "reservations" r
JOIN "members" m ON m."id" = r."memberId"
JOIN "member_categories" mc ON mc."id" = m."categoryId"
JOIN "reservable_spaces" s ON s."id" = r."spaceId"
WHERE r."status" IN ('APPROVED', 'COMPLETED')
  AND NOT EXISTS (SELECT 1 FROM "financial_charges" fc WHERE fc."reservationId" = r."id")
  AND (NOT (mc."isDependent" OR mc."requiresHolder") OR m."titularMemberId" IS NOT NULL);
