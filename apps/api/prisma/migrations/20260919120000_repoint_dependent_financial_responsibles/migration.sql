UPDATE "financial_charges" AS fc
SET "responsibleMemberId" = COALESCE(m."titularMemberId", m."id")
FROM "members" AS m
WHERE fc."memberId" = m."id";
