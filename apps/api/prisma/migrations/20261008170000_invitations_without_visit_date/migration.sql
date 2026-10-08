DROP INDEX IF EXISTS "visitor_invitations_quotaOwnerMemberId_scheduledDate_status_idx";

ALTER TABLE "visitor_invitations"
  ALTER COLUMN "scheduledDate" DROP NOT NULL;

CREATE INDEX "visitor_invitations_quotaOwnerMemberId_createdAt_status_idx"
  ON "visitor_invitations"("quotaOwnerMemberId", "createdAt", "status");
