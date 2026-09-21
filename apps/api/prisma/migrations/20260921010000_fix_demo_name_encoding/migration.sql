-- Corrige somente o nome demonstrativo comprovadamente corrompido pela seed.
-- O identificador e o valor anterior protegem dados editados pelo usuário.
UPDATE "persons"
SET "fullName" = 'Sérgio Klein', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'person-member-sergio-klein'
  AND "fullName" = U&'S\00C3\00A9rgio Klein';
