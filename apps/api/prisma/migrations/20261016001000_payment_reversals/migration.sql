-- Preserve the original receipt and the explicit correction; never delete payment history.
ALTER TABLE public.financial_payments ADD COLUMN "reversedAt" TIMESTAMP(3), ADD COLUMN "reversedByUserId" TEXT, ADD COLUMN "reversalReason" TEXT;
ALTER TABLE public.financial_charges ADD COLUMN "settlementReversedAt" TIMESTAMP(3), ADD COLUMN "settlementReversedByUserId" TEXT, ADD COLUMN "settlementReversalReason" TEXT;
