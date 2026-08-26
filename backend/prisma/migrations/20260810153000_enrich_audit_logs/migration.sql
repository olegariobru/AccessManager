ALTER TABLE "audit_logs"
  ADD COLUMN "actorName" VARCHAR(150),
  ADD COLUMN "actorEmail" VARCHAR(255),
  ADD COLUMN "description" VARCHAR(255);

UPDATE "audit_logs" AS audit
SET
  "actorName" = COALESCE(actor."name", CASE
    WHEN audit."actorId" IS NULL THEN 'Sistema'
    ELSE 'Usuário #' || audit."actorId"::TEXT
  END),
  "actorEmail" = actor."email",
  "description" = CASE audit."action"
    WHEN 'USER_CREATED' THEN 'Usuário criado'
    WHEN 'USER_ACCESS_UPDATED' THEN 'Acesso do usuário atualizado'
    WHEN 'USER_DEACTIVATED' THEN 'Usuário inativado'
    WHEN 'PASSWORD_CHANGED' THEN 'Senha alterada pelo próprio usuário'
    WHEN 'PASSWORD_RESET_BY_ADMIN' THEN 'Senha redefinida por um administrador'
    WHEN 'COORDINATOR_GROUP_ASSIGNED' THEN 'Grupo atribuído ao coordenador'
    WHEN 'COORDINATOR_GROUP_REMOVED' THEN 'Grupo removido do coordenador'
    WHEN 'VACATION_REQUEST_CREATED' THEN 'Solicitação de férias criada'
    WHEN 'VACATION_STATUS_CHANGED' THEN 'Situação da solicitação de férias alterada'
    WHEN 'VACATION_SCHEDULED_BY_HR' THEN 'Férias marcadas pelo RH'
    WHEN 'VACATION_APPROVED_BY_HR' THEN 'Férias aprovadas pelo RH'
    WHEN 'VACATION_REJECTED_BY_HR' THEN 'Férias recusadas pelo RH'
    WHEN 'VACATION_CANCELLED' THEN 'Solicitação de férias cancelada'
    WHEN 'PAYSLIP_SAVED' THEN 'Holerite salvo'
    WHEN 'PAYSLIP_PUBLISHED' THEN 'Holerite publicado'
    ELSE LOWER(REPLACE(audit."action", '_', ' '))
  END
FROM "User" AS actor
WHERE actor."id" = audit."actorId";

UPDATE "audit_logs"
SET
  "actorName" = COALESCE("actorName", CASE
    WHEN "actorId" IS NULL THEN 'Sistema'
    ELSE 'Usuário #' || "actorId"::TEXT
  END),
  "description" = COALESCE("description", LOWER(REPLACE("action", '_', ' ')));

ALTER TABLE "audit_logs"
  ALTER COLUMN "actorName" SET NOT NULL,
  ALTER COLUMN "description" SET NOT NULL;
