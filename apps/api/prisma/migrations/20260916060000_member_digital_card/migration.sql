ALTER TABLE "persons" ADD COLUMN "photoPath" TEXT;
ALTER TABLE "persons" ADD COLUMN "credentialToken" TEXT;
UPDATE "persons" SET "credentialToken" = 'cred-' || md5("id") WHERE "credentialToken" IS NULL;
ALTER TABLE "persons" ALTER COLUMN "credentialToken" SET NOT NULL;
CREATE UNIQUE INDEX "persons_credentialToken_key" ON "persons"("credentialToken");
