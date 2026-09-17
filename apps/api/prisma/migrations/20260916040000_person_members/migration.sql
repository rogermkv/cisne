CREATE TABLE "persons" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3),
  "phone" TEXT,
  "email" TEXT,
  "city" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);
INSERT INTO "persons" ("id","fullName","cpf","birthDate","email","createdAt","updatedAt")
SELECT "id", "name", "cpf", "birthDate", "email", "createdAt", "updatedAt" FROM "users";
CREATE UNIQUE INDEX "persons_cpf_key" ON "persons"("cpf");
CREATE UNIQUE INDEX "persons_email_key" ON "persons"("email");

ALTER TABLE "users" ADD COLUMN "personId" TEXT;
UPDATE "users" SET "personId" = "id";
ALTER TABLE "users" ALTER COLUMN "personId" SET NOT NULL;
CREATE UNIQUE INDEX "users_personId_key" ON "users"("personId");
ALTER TABLE "users" ADD CONSTRAINT "users_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "users" DROP COLUMN "cpf";
ALTER TABLE "users" DROP COLUMN "birthDate";
ALTER TABLE "users" DROP COLUMN "phone";
ALTER TABLE "users" DROP COLUMN "email";

CREATE TABLE "member_categories" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "member_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "member_categories_name_key" ON "member_categories"("name");
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE','INACTIVE','SUSPENDED','TERMINATED');
CREATE TABLE "members" (
  "id" TEXT NOT NULL, "personId" TEXT NOT NULL, "categoryId" TEXT NOT NULL, "registrationNumber" TEXT,
  "admissionDate" TIMESTAMP(3) NOT NULL, "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE', "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "members_personId_key" ON "members"("personId");
CREATE UNIQUE INDEX "members_registrationNumber_key" ON "members"("registrationNumber");
ALTER TABLE "members" ADD CONSTRAINT "members_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "member_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "dependents" (
  "id" TEXT NOT NULL, "personId" TEXT NOT NULL, "holderMemberId" TEXT NOT NULL, "relationship" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dependents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dependents_personId_holderMemberId_key" ON "dependents"("personId","holderMemberId");
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_holderMemberId_fkey" FOREIGN KEY ("holderMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
