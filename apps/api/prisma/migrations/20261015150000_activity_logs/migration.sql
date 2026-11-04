CREATE TABLE activity_logs (
 id TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "actorRole" TEXT, "assignedRoles" TEXT[] NOT NULL,
 authenticated BOOLEAN NOT NULL DEFAULT true, module TEXT NOT NULL, action TEXT NOT NULL, route TEXT NOT NULL,
 method TEXT NOT NULL, "targetId" TEXT, status TEXT NOT NULL, "statusCode" INTEGER NOT NULL, details JSONB NOT NULL
);
CREATE INDEX "activity_logs_createdAt_id_idx" ON activity_logs("createdAt",id);
CREATE INDEX "activity_logs_actorId_createdAt_idx" ON activity_logs("actorId","createdAt");
CREATE INDEX "activity_logs_actorRole_module_createdAt_idx" ON activity_logs("actorRole",module,"createdAt");
CREATE TABLE activity_changes (
 sequence SERIAL NOT NULL UNIQUE,
 id TEXT PRIMARY KEY, "logId" TEXT NOT NULL REFERENCES activity_logs(id), "tableName" TEXT NOT NULL,
 "recordId" TEXT NOT NULL, label TEXT NOT NULL, operation TEXT NOT NULL, before JSONB NOT NULL, after JSONB NOT NULL
);
CREATE INDEX "activity_changes_logId_idx" ON activity_changes("logId");
-- Redaction happens inside PostgreSQL, before any row is persisted in the audit trail.
CREATE FUNCTION cisne_audit_clean(value JSONB) RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result JSONB;
BEGIN
 IF jsonb_typeof(value)='object' THEN
  SELECT coalesce(jsonb_object_agg(key,cisne_audit_clean(v)), '{}'::jsonb) INTO result
   FROM jsonb_each(value) AS fields(key,v) WHERE key !~* '(password|token|secret|credential|authorization|cookie|hash)';
  RETURN result;
 ELSIF jsonb_typeof(value)='array' THEN
  SELECT coalesce(jsonb_agg(cisne_audit_clean(v)), '[]'::jsonb) INTO result FROM jsonb_array_elements(value) AS elements(v);
  RETURN result;
 END IF;
 RETURN value;
END $$;
CREATE FUNCTION cisne_capture_activity_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE log_id TEXT; old_value JSONB := '{}'::jsonb; new_value JSONB := '{}'::jsonb; source JSONB; title TEXT; record_id TEXT; related TEXT;
BEGIN
 log_id := nullif(current_setting('cisne.activity_log_id',true),'');
 IF log_id IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP<>'INSERT' THEN old_value := cisne_audit_clean(to_jsonb(OLD)); END IF;
 IF TG_OP<>'DELETE' THEN new_value := cisne_audit_clean(to_jsonb(NEW)); END IF;
 source := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 record_id := coalesce(source->>'id',nullif(concat_ws(':',source->>'userId',source->>'roleId',source->>'permissionId'),''),'registro');
 title := coalesce(source->>'fullName',source->>'name',source->>'title',source->>'description',source->>'registrationNumber',record_id);
 IF source ? 'personId' THEN
  SELECT p."fullName" INTO related FROM persons p WHERE p.id=source->>'personId';
  title := coalesce(related,title);
 ELSIF source ? 'memberId' THEN
  SELECT p."fullName" INTO related FROM members m JOIN persons p ON p.id=m."personId" WHERE m.id=source->>'memberId';
  title := concat_ws(' · ',nullif(title,record_id),related);
 ELSIF source ? 'userId' THEN
  SELECT p."fullName" INTO related FROM users u JOIN persons p ON p.id=u."personId" WHERE u.id=source->>'userId';
  title := coalesce(related,title);
 END IF;
 IF source ? 'spaceId' THEN
  SELECT name INTO related FROM reservable_spaces WHERE id=source->>'spaceId';
  title := concat_ws(' · ',nullif(title,record_id),related);
 END IF;
 IF source ? 'chargeId' THEN
  SELECT concat_ws(' · ',c.description,p."fullName") INTO related FROM financial_charges c LEFT JOIN members m ON m.id=c."memberId" LEFT JOIN persons p ON p.id=m."personId" WHERE c.id=source->>'chargeId';
  title := concat_ws(' · ',nullif(title,record_id),related);
 END IF;
 IF TG_TABLE_NAME='user_roles' THEN
  SELECT CASE name WHEN 'ADMIN' THEN 'Administrador' WHEN 'SECRETARIA' THEN 'Secretaria' WHEN 'FUNCIONARIO' THEN 'Funcionário' WHEN 'SOCIO' THEN 'Sócio' ELSE name END INTO related FROM roles WHERE id=source->>'roleId';
  title := concat_ws(' · ',title,related);
 END IF;
 IF TG_OP='UPDATE' THEN
   SELECT coalesce(jsonb_object_agg(key,v),'{}'::jsonb) INTO new_value FROM jsonb_each(new_value) AS f(key,v) WHERE v IS DISTINCT FROM old_value->key;
   SELECT coalesce(jsonb_object_agg(key,v),'{}'::jsonb) INTO old_value FROM jsonb_each(old_value) AS f(key,v) WHERE new_value ? key;
 END IF;
 INSERT INTO activity_changes(id,"logId","tableName","recordId",label,operation,before,after)
 VALUES(gen_random_uuid()::text,log_id,TG_TABLE_NAME,record_id,coalesce(title,record_id),TG_OP,old_value,new_value);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE item RECORD; BEGIN
 FOR item IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations','activity_logs','activity_changes','access_audits') LOOP
  EXECUTE format('CREATE TRIGGER cisne_activity_change AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION cisne_capture_activity_change()',item.tablename);
 END LOOP;
END $$;
-- Finalized entries are append-only, including direct writes from the application connection.
CREATE FUNCTION cisne_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='activity_logs' THEN
  IF TG_OP='UPDATE' THEN
   IF OLD.status='PENDING' AND NEW.id=OLD.id AND NEW.status IN ('SUCCESS','BLOCKED','FAILED') THEN RETURN NEW; END IF;
  END IF;
 END IF;
 RAISE EXCEPTION 'O histórico de atividades não pode ser alterado ou excluído.' USING ERRCODE='23514';
END $$;
CREATE TRIGGER activity_logs_immutable BEFORE UPDATE OR DELETE ON activity_logs FOR EACH ROW EXECUTE FUNCTION cisne_audit_immutable();
CREATE TRIGGER activity_changes_immutable BEFORE UPDATE OR DELETE ON activity_changes FOR EACH ROW EXECUTE FUNCTION cisne_audit_immutable();
DO $$ DECLARE reader RECORD; BEGIN
 FOR reader IN SELECT rolname FROM pg_roles WHERE has_table_privilege(oid,'public.members','SELECT') AND NOT has_table_privilege(oid,'public.members','INSERT,UPDATE,DELETE,TRUNCATE') LOOP
  EXECUTE format('GRANT SELECT ON activity_logs, activity_changes TO %I',reader.rolname);
  EXECUTE format('GRANT SELECT ON SEQUENCE activity_changes_sequence_seq TO %I',reader.rolname);
 END LOOP;
END $$;
