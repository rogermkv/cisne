ALTER TABLE "visitor_invitations" ADD COLUMN "quotaOwnerMemberId" TEXT;

UPDATE "visitor_invitations" vi
SET "quotaOwnerMemberId" = COALESCE(m."titularMemberId", m."id")
FROM "members" m
WHERE vi."sponsorMemberId" = m."id";

ALTER TABLE "visitor_invitations" ALTER COLUMN "quotaOwnerMemberId" SET NOT NULL;

ALTER TABLE "visitor_invitations"
  ADD CONSTRAINT "visitor_invitations_quotaOwnerMemberId_fkey"
  FOREIGN KEY ("quotaOwnerMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "visitor_invitations_quotaOwnerMemberId_scheduledDate_status_idx"
  ON "visitor_invitations"("quotaOwnerMemberId", "scheduledDate", "status");

UPDATE "club_settings" SET "memberMonthlyInvitationLimit" = 8;
