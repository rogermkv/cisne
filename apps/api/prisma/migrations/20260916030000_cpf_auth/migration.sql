ALTER TABLE "users" ADD COLUMN "cpf" TEXT;
ALTER TABLE "users" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the existing local administrator while introducing the required CPF key.
UPDATE "users" SET "cpf" = '52998224725' WHERE "cpf" IS NULL;

ALTER TABLE "users" ALTER COLUMN "cpf" SET NOT NULL;
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");
DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
