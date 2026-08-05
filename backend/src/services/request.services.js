const requestRepository = require("../repositories/request.repository");
const securityRepository = require("../repositories/security.repository");

const REVIEW_STATUSES = ["APPROVED", "REJECTED"];

function isHumanResources(user) {
  return Boolean(user?.isHr || user?.role === "ADMIN");
}

function httpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function parseDate(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw httpError(`Data de ${field} inválida`, 400, "INVALID_DATE");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw httpError(`Data de ${field} inválida`, 400, "INVALID_DATE");
  }
  return date;
}

function daysInclusive(startDate, endDate) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
}

async function createRequest(user, payload = {}) {
  if (!["USER", "COORDINATOR", "ADMIN"].includes(user.role)) {
    throw httpError("Perfil sem permissão para criar solicitações", 403, "FORBIDDEN");
  }
  const startDate = parseDate(payload.startDate, "início");
  const endDate = parseDate(payload.endDate, "fim");
  if (endDate < startDate) {
    throw httpError("Período de férias inválido", 400, "INVALID_VACATION_PERIOD");
  }
  const days = daysInclusive(startDate, endDate);
  const initialStatus = user.role === "COORDINATOR" ? "PENDING_HR" : "PENDING";
  const request = await requestRepository.createVacation({
    userId: user.id,
    startDate,
    endDate,
    days,
    notes: String(payload.notes || "").trim().slice(0, 500) || null,
    initialStatus,
  });
  await securityRepository.audit({
    actorId: user.id,
    action: "VACATION_REQUEST_CREATED",
    entityType: "VacationRequest",
    entityId: request.id,
    changes: { startDate: payload.startDate, endDate: payload.endDate, days, initialStatus },
  });
  return request;
}

async function listRequests(user) {
  const scope = user.role === "ADMIN"
    ? {}
    : user.role === "COORDINATOR"
      ? { groupIds: user.groupIds }
      : { userId: user.id };
  return requestRepository.list(scope);
}

async function listOwnRequests(user) {
  return requestRepository.list({ userId: user.id });
}

async function listHrRequests(user) {
  if (!isHumanResources(user)) {
    throw httpError("Somente integrantes do RH podem acessar esta fila", 403, "HR_ACCESS_DENIED");
  }
  return requestRepository.list({ statuses: ["PENDING_HR", "APPROVED", "REJECTED"] });
}

async function reviewRequest(user, requestId, payload = {}) {
  if (!["ADMIN", "COORDINATOR"].includes(user.role)) {
    throw httpError("Você não tem permissão para analisar solicitações", 403, "FORBIDDEN");
  }
  const status = String(payload.status || "").toUpperCase();
  if (!REVIEW_STATUSES.includes(status)) {
    throw httpError("Status de análise inválido", 400, "INVALID_STATUS");
  }
  const request = await requestRepository.findById(requestId);
  if (!request) throw httpError("Solicitação não encontrada", 404, "REQUEST_NOT_FOUND");
  if (user.role === "COORDINATOR" && Number(request.userId) === Number(user.id)) {
    throw httpError("Coordenadores não podem analisar as próprias férias", 403, "SELF_REVIEW_DENIED");
  }
  if (user.role === "COORDINATOR" && !user.groupIds.includes(request.groupId)) {
    throw httpError("Esta solicitação pertence a outro grupo", 403, "CROSS_GROUP_ACCESS_DENIED");
  }
  const nextStatus = status === "APPROVED" ? "PENDING_HR" : "REJECTED";
  const updated = await requestRepository.updateStatus({
    id: requestId,
    status: nextStatus,
    reviewerId: user.id,
    reason: String(payload.reason || "").trim().slice(0, 500) || null,
  });
  await securityRepository.audit({
    actorId: user.id,
    action: "VACATION_STATUS_CHANGED",
    entityType: "VacationRequest",
    entityId: requestId,
    changes: {
      from: request.status,
      to: nextStatus,
      coordinatorDecision: status,
      reason: payload.reason,
    },
  });
  return updated;
}

async function markRequestByHr(user, requestId, payload = {}) {
  if (!isHumanResources(user)) {
    throw httpError("Somente integrantes do RH podem marcar férias", 403, "HR_ACCESS_DENIED");
  }
  const request = await requestRepository.findById(requestId);
  if (!request) throw httpError("Solicitação não encontrada", 404, "REQUEST_NOT_FOUND");

  const reason = String(payload.reason || "Férias marcadas pelo RH").trim().slice(0, 500);
  const updated = await requestRepository.markAsScheduled({
    id: requestId,
    schedulerId: user.id,
    reason,
  });
  await securityRepository.audit({
    actorId: user.id,
    action: "VACATION_SCHEDULED_BY_HR",
    entityType: "VacationRequest",
    entityId: requestId,
    changes: { from: request.status, to: "APPROVED", reason },
  });
  return updated;
}

async function decideRequestByHr(user, requestId, payload = {}) {
  if (!isHumanResources(user) && user.role !== "ADMIN") {
    throw httpError("Somente integrantes do RH podem decidir sobre férias", 403, "HR_ACCESS_DENIED");
  }
  const status = String(payload.status || "").toUpperCase();
  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw httpError("Decisão do RH inválida", 400, "INVALID_STATUS");
  }
  const reason = String(payload.reason || "").trim().slice(0, 500);
  if (status === "REJECTED" && !reason) {
    throw httpError("Informe o motivo da recusa", 400, "REASON_REQUIRED");
  }
  const request = await requestRepository.findById(requestId);
  if (!request) throw httpError("Solicitação não encontrada", 404, "REQUEST_NOT_FOUND");
  const updated = await requestRepository.decideByHr({
    id: requestId,
    status,
    schedulerId: user.id,
    reason: reason || "Férias aprovadas pelo RH",
  });
  await securityRepository.audit({
    actorId: user.id,
    action: status === "APPROVED" ? "VACATION_APPROVED_BY_HR" : "VACATION_REJECTED_BY_HR",
    entityType: "VacationRequest",
    entityId: requestId,
    changes: { from: request.status, to: status, reason: reason || null },
  });
  return updated;
}

async function cancelRequest(user, requestId, reason) {
  const updated = await requestRepository.cancel({
    id: requestId,
    userId: user.id,
    reason: String(reason || "").trim().slice(0, 500) || null,
  });
  if (!updated) throw httpError("Solicitação não encontrada", 404, "REQUEST_NOT_FOUND");
  await securityRepository.audit({
    actorId: user.id,
    action: "VACATION_CANCELLED",
    entityType: "VacationRequest",
    entityId: requestId,
    changes: { reason },
  });
  return updated;
}

module.exports = {
  createRequest,
  listRequests,
  listHrRequests,
  reviewRequest,
  markRequestByHr,
  decideRequestByHr,
  cancelRequest,
  listOwnRequests,
};
