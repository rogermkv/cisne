ALTER TYPE "FinancialPaymentMethod" ADD VALUE IF NOT EXISTS 'BOLETO';
CREATE TABLE annual_seasons (id TEXT PRIMARY KEY,"endYear" INTEGER NOT NULL UNIQUE CHECK("endYear" BETWEEN 1901 AND 9999),amount DECIMAL(12,2) NOT NULL CHECK(amount>0),"enrollmentOpen" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE annual_enrollments (id TEXT PRIMARY KEY,"seasonId" TEXT NOT NULL REFERENCES annual_seasons(id),"responsibleMemberId" TEXT NOT NULL REFERENCES members(id),mode TEXT NOT NULL CHECK(mode IN ('ADVANCE_12','CREDIT_CARD','PIX_ONCE','INSTALLMENTS_4')),amount DECIMAL(12,2) NOT NULL CHECK(amount>0),"createdByUserId" TEXT NOT NULL REFERENCES users(id),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE("seasonId","responsibleMemberId"));
CREATE TABLE annual_payment_settings (id TEXT PRIMARY KEY CHECK(id='club'),"pixKey" TEXT NOT NULL DEFAULT '',beneficiary TEXT NOT NULL DEFAULT '',whatsapp TEXT NOT NULL DEFAULT '',"updatedAt" TIMESTAMP(3) NOT NULL);
-- Public club receiving instructions supplied by the club; editable in the application.
-- These are payment identifiers, not passwords, banking authorization or private keys.
INSERT INTO annual_payment_settings(id,"pixKey",beneficiary,whatsapp,"updatedAt") VALUES ('club','sercisne@bol.com.br','Clube Ser Cisne','5555984247348',CURRENT_TIMESTAMP);
-- Open the next season using the club's existing configured fee. No charges are generated.
INSERT INTO annual_seasons(id,"endYear",amount,"enrollmentOpen","updatedAt")
SELECT 'annual-initial-2027',2027,"annualFeeAmount",true,CURRENT_TIMESTAMP FROM club_settings WHERE "annualFeeAmount">=0.12 ORDER BY "updatedAt" DESC LIMIT 1;
ALTER TABLE financial_charges ADD COLUMN "annualEnrollmentId" TEXT REFERENCES annual_enrollments(id),ADD COLUMN "installmentNumber" INTEGER;
CREATE UNIQUE INDEX financial_charges_annual_installment_key ON financial_charges("annualEnrollmentId","installmentNumber");
CREATE TABLE financial_documents (id TEXT PRIMARY KEY,"chargeId" TEXT NOT NULL REFERENCES financial_charges(id),kind TEXT NOT NULL CHECK(kind IN ('PROOF','BOLETO')),status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED','AVAILABLE','SUPERSEDED')),"mediaAssetId" TEXT NOT NULL UNIQUE REFERENCES media_assets(id),"submittedByUserId" TEXT NOT NULL REFERENCES users(id),"reviewedByUserId" TEXT REFERENCES users(id),"reviewedAt" TIMESTAMP(3),"rejectionReason" TEXT,"paymentId" TEXT UNIQUE REFERENCES financial_payments(id),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX financial_documents_charge_created_idx ON financial_documents("chargeId","createdAt");
CREATE UNIQUE INDEX financial_documents_one_pending_proof ON financial_documents("chargeId") WHERE kind='PROOF' AND status='PENDING';
CREATE UNIQUE INDEX financial_documents_one_current_boleto ON financial_documents("chargeId") WHERE kind='BOLETO' AND status='AVAILABLE';
DO $$ DECLARE name TEXT; BEGIN
 FOREACH name IN ARRAY ARRAY['annual_seasons','annual_enrollments','annual_payment_settings','financial_documents'] LOOP
  EXECUTE format('CREATE TRIGGER cisne_activity_change AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION cisne_capture_activity_change()',name);
 END LOOP;
END $$;
DO $$ DECLARE reader RECORD; BEGIN
 FOR reader IN SELECT rolname FROM pg_roles WHERE has_table_privilege(oid,'public.members','SELECT') AND NOT has_table_privilege(oid,'public.members','INSERT,UPDATE,DELETE,TRUNCATE') LOOP
  EXECUTE format('GRANT SELECT ON annual_seasons,annual_enrollments,annual_payment_settings,financial_documents TO %I',reader.rolname);
 END LOOP;
END $$;
