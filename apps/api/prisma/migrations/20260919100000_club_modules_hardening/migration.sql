ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "member_categories"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isDependent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresHolder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "annualFeeAmount" DECIMAL(12,2);
UPDATE "member_categories" SET "isDependent" = true, "requiresHolder" = true WHERE lower("name") = 'dependente';

ALTER TABLE "reservable_spaces" ADD COLUMN "reservationRules" TEXT;
ALTER TABLE "announcements" ALTER COLUMN "endDate" DROP NOT NULL;
ALTER TABLE "announcements" ADD COLUMN "imagePath" TEXT;

ALTER TABLE "financial_charges" ADD COLUMN "responsibleMemberId" TEXT;
UPDATE "financial_charges" SET "responsibleMemberId" = "memberId" WHERE "responsibleMemberId" IS NULL;
ALTER TABLE "financial_charges" ALTER COLUMN "responsibleMemberId" SET NOT NULL;
CREATE INDEX "financial_charges_responsibleMemberId_dueDate_idx" ON "financial_charges"("responsibleMemberId", "dueDate");
CREATE INDEX "financial_charges_dueDate_status_idx" ON "financial_charges"("dueDate", "status");
ALTER TABLE "financial_charges" ADD CONSTRAINT "financial_charges_responsibleMemberId_fkey" FOREIGN KEY ("responsibleMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TYPE "FinancialPaymentMethod" AS ENUM ('PIX','CASH','CREDIT_CARD','DEBIT_CARD','BANK_TRANSFER','OTHER');
CREATE TABLE "financial_payments" (
  "id" TEXT NOT NULL,
  "chargeId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" "FinancialPaymentMethod" NOT NULL,
  "notes" TEXT,
  "registeredByUserId" TEXT,
  CONSTRAINT "financial_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "financial_payments_chargeId_paidAt_idx" ON "financial_payments"("chargeId", "paidAt");
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "financial_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_payments" ADD CONSTRAINT "financial_payments_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
