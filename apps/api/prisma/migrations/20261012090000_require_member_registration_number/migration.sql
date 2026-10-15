-- Preserve existing registrations and serialize the backfill with writes.
BEGIN;
LOCK TABLE "members" IN ACCESS EXCLUSIVE MODE;
CREATE SEQUENCE "member_registration_number_seq";
ALTER SEQUENCE "member_registration_number_seq" OWNED BY "members"."registrationNumber";

DO $$
DECLARE
  max_number BIGINT;
  member_id TEXT;
  generated_number TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN btrim("registrationNumber") ~ '^[0-9]+$'
      THEN btrim("registrationNumber")::BIGINT ELSE 0 END
  ), 0) INTO max_number FROM "members";
  IF max_number > 0 THEN
    PERFORM setval('"member_registration_number_seq"', max_number);
  ELSE
    PERFORM setval('"member_registration_number_seq"', 1, false);
  END IF;

  FOR member_id IN SELECT "id" FROM "members"
    WHERE "registrationNumber" IS NULL OR btrim("registrationNumber") = ''
    ORDER BY "admissionDate", "createdAt", "id"
  LOOP
    generated_number := nextval('"member_registration_number_seq"')::TEXT;
    UPDATE "members" SET "registrationNumber" =
      lpad(generated_number, greatest(6, length(generated_number)), '0')
      WHERE "id" = member_id;
  END LOOP;
END $$;

-- Padding must not truncate numbers after 999999.
CREATE FUNCTION next_member_registration_number() RETURNS TEXT
LANGUAGE SQL VOLATILE AS $$
  SELECT lpad(n, greatest(6, length(n)), '0')
  FROM (SELECT nextval('member_registration_number_seq'::regclass)::TEXT AS n) AS allocated;
$$;
ALTER TABLE "members"
  ALTER COLUMN "registrationNumber" SET DEFAULT next_member_registration_number(),
  ALTER COLUMN "registrationNumber" SET NOT NULL;
COMMIT;
