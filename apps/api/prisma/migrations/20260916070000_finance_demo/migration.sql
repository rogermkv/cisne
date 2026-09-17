ALTER TABLE "club_settings" ADD COLUMN "annualFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 1600;
ALTER TABLE "club_settings" ADD COLUMN "annualFeePaymentModes" TEXT NOT NULL DEFAULT 'PIX,CREDIT_CARD,MONTHLY_PIX';
CREATE TYPE "FinancialChargeType" AS ENUM ('ANNUAL_FEE','RESERVATION','EVENT','OTHER');
CREATE TYPE "FinancialChargeStatus" AS ENUM ('PENDING','PAID','OVERDUE','CANCELLED');
CREATE TABLE "financial_charges" ("id" TEXT NOT NULL,"memberId" TEXT NOT NULL,"type" "FinancialChargeType" NOT NULL,"description" TEXT NOT NULL,"referenceYear" INTEGER,"amount" DECIMAL(12,2) NOT NULL,"dueDate" TIMESTAMP(3) NOT NULL,"status" "FinancialChargeStatus" NOT NULL DEFAULT 'PENDING',"paidAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "financial_charges_pkey" PRIMARY KEY ("id"));
ALTER TABLE "financial_charges" ADD CONSTRAINT "financial_charges_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
