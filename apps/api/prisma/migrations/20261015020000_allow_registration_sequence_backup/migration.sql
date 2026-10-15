-- Existing read-only database exporters need to read the new sequence state.
-- SELECT permits backup; USAGE/UPDATE (nextval/setval) remain ungranted.
BEGIN;
DO $$
DECLARE
  reader RECORD;
BEGIN
  FOR reader IN
    SELECT rolname FROM pg_roles
    WHERE has_table_privilege(oid, 'public.members', 'SELECT')
      AND NOT has_table_privilege(oid, 'public.members', 'INSERT,UPDATE,DELETE,TRUNCATE')
  LOOP
    EXECUTE format('GRANT SELECT ON SEQUENCE public.member_registration_number_seq TO %I', reader.rolname);
  END LOOP;
END $$;
COMMIT;
