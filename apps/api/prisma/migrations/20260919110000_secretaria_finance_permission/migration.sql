INSERT INTO "permissions" ("id", "key")
SELECT 'permission-finance-manage', 'finance.manage'
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "key" = 'finance.manage');
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'SECRETARIA' AND p."key" = 'finance.manage'
  AND NOT EXISTS (SELECT 1 FROM "role_permissions" rp WHERE rp."roleId" = r."id" AND rp."permissionId" = p."id");
