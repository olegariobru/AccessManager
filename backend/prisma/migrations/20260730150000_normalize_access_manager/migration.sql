-- SCRUM-87..94: expand-and-migrate phase.
-- This migration intentionally preserves User.role/cargo/grupo and EmployeeRequest
-- so production can be rolled back before the later contract phase.

CREATE TYPE "RoleCode" AS ENUM ('USER', 'COORDINATOR', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE TABLE "roles" (
  "id" SERIAL NOT NULL,
  "code" "RoleCode" NOT NULL,
  "description" VARCHAR(255),
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

CREATE TABLE "groups" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");
CREATE UNIQUE INDEX "groups_slug_key" ON "groups"("slug");
CREATE INDEX "groups_isActive_idx" ON "groups"("isActive");
CREATE UNIQUE INDEX "groups_name_ci_key" ON "groups"(LOWER("name"));

CREATE TABLE "positions" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "positions_name_key" ON "positions"("name");
CREATE INDEX "positions_isActive_idx" ON "positions"("isActive");
CREATE UNIQUE INDEX "positions_name_ci_key" ON "positions"(LOWER("name"));

CREATE TABLE "user_roles" (
  "userId" INTEGER NOT NULL,
  "roleId" INTEGER NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "roleId")
);
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

CREATE TABLE "user_memberships" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "groupId" INTEGER NOT NULL,
  "positionId" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "isPrimary" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_memberships_userId_endsAt_idx" ON "user_memberships"("userId", "endsAt");
CREATE INDEX "user_memberships_groupId_endsAt_idx" ON "user_memberships"("groupId", "endsAt");
CREATE INDEX "user_memberships_positionId_idx" ON "user_memberships"("positionId");
CREATE UNIQUE INDEX "user_memberships_active_primary_key"
  ON "user_memberships"("userId")
  WHERE "endsAt" IS NULL AND "isPrimary" = true;

CREATE TABLE "group_coordinators" (
  "userId" INTEGER NOT NULL,
  "groupId" INTEGER NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "group_coordinators_pkey" PRIMARY KEY ("userId", "groupId")
);
CREATE INDEX "group_coordinators_groupId_idx" ON "group_coordinators"("groupId");

CREATE TABLE "vacation_requests" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "groupId" INTEGER NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "days" INTEGER NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "notes" VARCHAR(500),
  "reviewedById" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vacation_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vacation_requests_period_check" CHECK ("endDate" >= "startDate"),
  CONSTRAINT "vacation_requests_days_check" CHECK ("days" > 0)
);
CREATE INDEX "vacation_requests_userId_status_idx" ON "vacation_requests"("userId", "status");
CREATE INDEX "vacation_requests_groupId_status_createdAt_idx" ON "vacation_requests"("groupId", "status", "createdAt");
CREATE INDEX "vacation_requests_startDate_endDate_idx" ON "vacation_requests"("startDate", "endDate");

CREATE TABLE "vacation_status_history" (
  "id" BIGSERIAL NOT NULL,
  "requestId" INTEGER NOT NULL,
  "fromStatus" "RequestStatus",
  "toStatus" "RequestStatus" NOT NULL,
  "changedById" INTEGER,
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vacation_status_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vacation_status_history_requestId_createdAt_idx" ON "vacation_status_history"("requestId", "createdAt");

CREATE TABLE "file_assets" (
  "id" UUID NOT NULL,
  "storageKey" VARCHAR(500) NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "checksum" VARCHAR(128),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "file_assets_size_check" CHECK ("sizeBytes" >= 0)
);
CREATE UNIQUE INDEX "file_assets_storageKey_key" ON "file_assets"("storageKey");

CREATE TABLE "payslips" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "grossAmount" DECIMAL(12,2),
  "netAmount" DECIMAL(12,2),
  "status" "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
  "fileId" UUID,
  "publishedById" INTEGER,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payslips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payslips_month_check" CHECK ("month" BETWEEN 1 AND 12),
  CONSTRAINT "payslips_year_check" CHECK ("year" BETWEEN 2000 AND 2200),
  CONSTRAINT "payslips_amount_check" CHECK (
    ("grossAmount" IS NULL OR "grossAmount" >= 0)
    AND ("netAmount" IS NULL OR "netAmount" >= 0)
  )
);
CREATE UNIQUE INDEX "payslips_userId_year_month_key" ON "payslips"("userId", "year", "month");
CREATE UNIQUE INDEX "payslips_fileId_key" ON "payslips"("fileId");
CREATE INDEX "payslips_year_month_status_idx" ON "payslips"("year", "month", "status");
CREATE INDEX "payslips_userId_status_idx" ON "payslips"("userId", "status");

CREATE TABLE "audit_logs" (
  "id" BIGSERIAL NOT NULL,
  "actorId" INTEGER,
  "action" VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(100) NOT NULL,
  "entityId" VARCHAR(100),
  "changes" JSONB,
  "requestId" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_coordinators" ADD CONSTRAINT "group_coordinators_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_coordinators" ADD CONSTRAINT "group_coordinators_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vacation_status_history" ADD CONSTRAINT "vacation_status_history_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "vacation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vacation_status_history" ADD CONSTRAINT "vacation_status_history_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_publishedById_fkey"
  FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "roles" ("code", "description") VALUES
  ('USER', 'Funcionário com acesso aos próprios dados'),
  ('COORDINATOR', 'Coordenador limitado aos grupos atribuídos'),
  ('ADMIN', 'Administrador com acesso organizacional global')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "groups" ("name", "slug")
SELECT DISTINCT
  UPPER(COALESCE(NULLIF(TRIM("grupo"), ''), 'USUARIOS')),
  LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM("grupo"), ''), 'USUARIOS'), '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || LEFT(MD5(LOWER(COALESCE(NULLIF(TRIM("grupo"), ''), 'USUARIOS'))), 8)
FROM "User"
ON CONFLICT DO NOTHING;

INSERT INTO "positions" ("name")
SELECT DISTINCT COALESCE(NULLIF(TRIM("cargo"), ''), 'Colaborador')
FROM "User"
ON CONFLICT DO NOTHING;

INSERT INTO "user_roles" ("userId", "roleId")
SELECT
  u."id",
  r."id"
FROM "User" u
JOIN "roles" r ON r."code" = (
  CASE UPPER(COALESCE(u."role", 'USER'))
    WHEN 'ADMIN' THEN 'ADMIN'::"RoleCode"
    WHEN 'COORDINATOR' THEN 'COORDINATOR'::"RoleCode"
    WHEN 'COORDENADOR' THEN 'COORDINATOR'::"RoleCode"
    ELSE 'USER'::"RoleCode"
  END
)
ON CONFLICT DO NOTHING;

INSERT INTO "user_memberships" ("userId", "groupId", "positionId")
SELECT u."id", g."id", p."id"
FROM "User" u
JOIN "groups" g
  ON LOWER(g."name") = LOWER(UPPER(COALESCE(NULLIF(TRIM(u."grupo"), ''), 'USUARIOS')))
JOIN "positions" p
  ON LOWER(p."name") = LOWER(COALESCE(NULLIF(TRIM(u."cargo"), ''), 'Colaborador'))
ON CONFLICT DO NOTHING;

INSERT INTO "group_coordinators" ("userId", "groupId")
SELECT ur."userId", um."groupId"
FROM "user_roles" ur
JOIN "roles" r ON r."id" = ur."roleId" AND r."code" = 'COORDINATOR'
JOIN "user_memberships" um ON um."userId" = ur."userId" AND um."endsAt" IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO "vacation_requests" (
  "userId", "groupId", "startDate", "endDate", "days", "status",
  "notes", "reviewedById", "reviewedAt", "createdAt", "updatedAt"
)
SELECT
  er."userId",
  um."groupId",
  er."startDate",
  er."endDate",
  (er."endDate" - er."startDate") + 1,
  CASE UPPER(er."status")
    WHEN 'APPROVED' THEN 'APPROVED'::"RequestStatus"
    WHEN 'REJECTED' THEN 'REJECTED'::"RequestStatus"
    ELSE 'PENDING'::"RequestStatus"
  END,
  er."notes",
  er."reviewedBy",
  er."reviewedAt",
  er."createdAt",
  er."updatedAt"
FROM "EmployeeRequest" er
JOIN "user_memberships" um ON um."userId" = er."userId" AND um."endsAt" IS NULL
WHERE er."type" = 'VACATION'
  AND er."startDate" IS NOT NULL
  AND er."endDate" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "vacation_requests" vr
    WHERE vr."userId" = er."userId"
      AND vr."startDate" = er."startDate"
      AND vr."endDate" = er."endDate"
      AND vr."createdAt" = er."createdAt"
  );

INSERT INTO "vacation_status_history" (
  "requestId", "fromStatus", "toStatus", "changedById", "reason", "createdAt"
)
SELECT
  vr."id",
  NULL,
  vr."status",
  vr."reviewedById",
  'Migrado de EmployeeRequest',
  vr."createdAt"
FROM "vacation_requests" vr
WHERE NOT EXISTS (
  SELECT 1 FROM "vacation_status_history" vh WHERE vh."requestId" = vr."id"
);

CREATE OR REPLACE VIEW "active_user_access" AS
SELECT
  u."id" AS "userId",
  u."name",
  u."email",
  u."status",
  r."code" AS "role",
  g."id" AS "groupId",
  g."name" AS "groupName",
  p."id" AS "positionId",
  p."name" AS "positionName"
FROM "User" u
JOIN "user_roles" ur ON ur."userId" = u."id"
JOIN "roles" r ON r."id" = ur."roleId"
LEFT JOIN "user_memberships" um
  ON um."userId" = u."id" AND um."endsAt" IS NULL AND um."isPrimary" = true
LEFT JOIN "groups" g ON g."id" = um."groupId"
LEFT JOIN "positions" p ON p."id" = um."positionId"
WHERE u."status" = 'ACTIVE' AND u."deletedAt" IS NULL;

CREATE OR REPLACE VIEW "vacation_request_metrics" AS
SELECT
  vr."groupId",
  DATE_TRUNC('month', vr."createdAt") AS "month",
  vr."status",
  COUNT(*)::BIGINT AS "total",
  AVG(EXTRACT(EPOCH FROM (vr."reviewedAt" - vr."createdAt")) / 3600.0)
    FILTER (WHERE vr."reviewedAt" IS NOT NULL) AS "averageReviewHours"
FROM "vacation_requests" vr
GROUP BY vr."groupId", DATE_TRUNC('month', vr."createdAt"), vr."status";
