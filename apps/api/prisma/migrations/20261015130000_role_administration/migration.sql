CREATE TABLE "access_audits" (
 "id" TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "actorId" TEXT NOT NULL, "targetUserId" TEXT NOT NULL, "action" TEXT NOT NULL,
 "before" JSONB NOT NULL, "after" JSONB NOT NULL
);
CREATE INDEX "access_audits_createdAt_idx" ON "access_audits"("createdAt");
CREATE INDEX "access_audits_targetUserId_createdAt_idx" ON "access_audits"("targetUserId", "createdAt");
-- Serialize all removals/deactivations, including legacy member-management endpoints.
CREATE FUNCTION cisne_preserve_active_admin() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id TEXT;
BEGIN
 PERFORM pg_advisory_xact_lock(715102026);
 IF TG_TABLE_NAME = 'users' THEN
   IF TG_OP = 'UPDATE' AND NEW.active THEN RETURN NEW; END IF;
   target_id := OLD.id;
 ELSE
   IF NOT EXISTS (SELECT 1 FROM roles WHERE id = OLD."roleId" AND name = 'ADMIN') THEN
     IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
   END IF;
   IF TG_OP = 'UPDATE' AND NEW."roleId" = OLD."roleId" AND NEW."userId" = OLD."userId" THEN RETURN NEW; END IF;
   target_id := OLD."userId";
 END IF;
 IF EXISTS (SELECT 1 FROM users u JOIN user_roles ur ON ur."userId"=u.id JOIN roles r ON r.id=ur."roleId" WHERE u.id=target_id AND u.active AND r.name='ADMIN')
 AND NOT EXISTS (SELECT 1 FROM users u JOIN user_roles ur ON ur."userId"=u.id JOIN roles r ON r.id=ur."roleId" WHERE u.id<>target_id AND u.active AND r.name='ADMIN') THEN
   RAISE EXCEPTION 'Mantenha pelo menos um administrador ativo.' USING ERRCODE='23514';
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER preserve_active_admin_user BEFORE UPDATE OF active OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION cisne_preserve_active_admin();
CREATE TRIGGER preserve_active_admin_role BEFORE DELETE OR UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION cisne_preserve_active_admin();
