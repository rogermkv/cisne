-- Unify the legacy dependents table with members while preserving Person IDs,
-- credential tokens, photos and access history.
INSERT INTO "member_categories" ("id", "name", "active", "createdAt", "updatedAt")
SELECT 'category-dependent', 'Dependente', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "member_categories" WHERE "name" = 'Dependente');

ALTER TABLE "members" ADD COLUMN "titularMemberId" TEXT;
ALTER TABLE "members" ADD COLUMN "relationship" TEXT;

UPDATE "members" AS m
SET "categoryId" = dc."id",
    "titularMemberId" = d."holderMemberId",
    "relationship" = d."relationship",
    "status" = CASE WHEN d."active" THEN 'ACTIVE'::"MemberStatus" ELSE 'INACTIVE'::"MemberStatus" END
FROM "dependents" AS d
CROSS JOIN (SELECT "id" FROM "member_categories" WHERE "name" = 'Dependente' LIMIT 1) AS dc
WHERE m."personId" = d."personId";

INSERT INTO "members" ("id", "personId", "categoryId", "admissionDate", "status", "relationship", "titularMemberId", "createdAt", "updatedAt")
SELECT d."id", d."personId", dc."id", d."createdAt",
       CASE WHEN d."active" THEN 'ACTIVE'::"MemberStatus" ELSE 'INACTIVE'::"MemberStatus" END,
       d."relationship", d."holderMemberId", d."createdAt", d."updatedAt"
FROM "dependents" AS d
CROSS JOIN (SELECT "id" FROM "member_categories" WHERE "name" = 'Dependente' LIMIT 1) AS dc
WHERE NOT EXISTS (SELECT 1 FROM "members" AS m WHERE m."personId" = d."personId");

CREATE INDEX "members_titularMemberId_idx" ON "members"("titularMemberId");
ALTER TABLE "members" ADD CONSTRAINT "members_titularMemberId_fkey" FOREIGN KEY ("titularMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "dependents";
