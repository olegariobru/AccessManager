const prisma = require("../config/prisma");

const ACTION_DESCRIPTIONS = {
  USER_CREATED: "Usuário criado",
  USER_ACCESS_UPDATED: "Acesso do usuário atualizado",
  USER_DEACTIVATED: "Usuário inativado",
  CLIENT_CREATED: "Cliente criado",
  PASSWORD_CHANGED: "Senha alterada pelo próprio usuário",
  PASSWORD_RESET_BY_ADMIN: "Senha redefinida por um administrador",
  COORDINATOR_GROUP_ASSIGNED: "Grupo atribuído ao coordenador",
  COORDINATOR_GROUP_REMOVED: "Grupo removido do coordenador",
  VACATION_REQUEST_CREATED: "Solicitação de férias criada",
  VACATION_STATUS_CHANGED: "Situação da solicitação de férias alterada",
  VACATION_SCHEDULED_BY_HR: "Férias marcadas pelo RH",
  VACATION_APPROVED_BY_HR: "Férias aprovadas pelo RH",
  VACATION_REJECTED_BY_HR: "Férias recusadas pelo RH",
  VACATION_CANCELLED: "Solicitação de férias cancelada",
  PAYSLIP_SAVED: "Holerite salvo",
  PAYSLIP_PUBLISHED: "Holerite publicado",
  PAYSLIP_DOWNLOADED: "Holerite baixado",
  IRPF_PUBLISHED: "Arquivo de IRPF publicado",
  ITAU_BANK_SLIP_PUBLISHED: "Boleto Itaú publicado",
  CLIENT_DOCUMENT_DOWNLOADED: "Documento do cliente baixado",
};

function describeAction(action) {
  return ACTION_DESCRIPTIONS[action] || String(action || "Evento de auditoria")
    .toLowerCase()
    .replaceAll("_", " ");
}

async function audit({ actorId, action, entityType, entityId, changes, description, requestId }, tx = prisma) {
  const normalizedActorId = actorId ? Number(actorId) : null;
  const actor = normalizedActorId
    ? await tx.user.findUnique({
      where: { id: normalizedActorId },
      select: { name: true, email: true },
    })
    : null;

  return tx.auditLog.create({
    data: {
      actorId: normalizedActorId,
      actorName: String(actor?.name || (normalizedActorId ? `Usuário #${normalizedActorId}` : "Sistema")).slice(0, 150),
      actorEmail: actor?.email ? String(actor.email).slice(0, 255) : null,
      action: String(action).slice(0, 100),
      description: String(description || describeAction(action)).slice(0, 255),
      entityType: String(entityType).slice(0, 100),
      entityId: entityId == null ? null : String(entityId).slice(0, 100),
      changes: changes || undefined,
      requestId: requestId ? String(requestId).slice(0, 100) : null,
    },
  });
}

module.exports = { audit, describeAction, ACTION_DESCRIPTIONS };
