-- Extend the existing read-only backup/export scope to the access-history table.
-- No role is created; no write privileges or administrative attributes are granted.
DO $$ DECLARE reader RECORD; BEGIN
 FOR reader IN
  SELECT rolname FROM pg_roles
  WHERE has_table_privilege(oid,'public.members','SELECT')
    AND NOT has_table_privilege(oid,'public.members','INSERT,UPDATE,DELETE,TRUNCATE')
 LOOP
  EXECUTE format('GRANT SELECT ON public.access_audits TO %I',reader.rolname);
 END LOOP;
END $$;
