const requestRepository = require("../repositories/request.repository");

const TYPES = ["VACATION", "PAYSLIP"];
const STATUSES = ["APPROVED", "REJECTED"];

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function createRequest(user, payload = {}) {
  if (String(user.role).toUpperCase() !== "USER") {
    throw httpError("Somente funcionários podem criar solicitações", 403);
  }

  const type = String(payload.type || "").toUpperCase();
  if (!TYPES.includes(type)) throw httpError("Tipo de solicitação inválido", 400);

  if (type === "VACATION") {
    if (!payload.startDate || !payload.endDate) {
      throw httpError("Informe as datas de início e fim das férias", 400);
    }
    const startDate = new Date(`${payload.startDate}T00:00:00`);
    const endDate = new Date(`${payload.endDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      throw httpError("Período de férias inválido", 400);
    }
  }

  return requestRepository.create({
    userId: user.id,
    type,
    startDate: type === "VACATION" ? payload.startDate : null,
    endDate: type === "VACATION" ? payload.endDate : null,
    notes: String(payload.notes || "").trim().slice(0, 500),
  });
}

async function listRequests(user) {
  const role = String(user.role || "").toUpperCase();
  if (role === "ADMIN") return requestRepository.findAll();
  if (role === "COORDINATOR") return requestRepository.findByGroup(user.grupo);
  return requestRepository.findByUser(user.id);
}

async function reviewRequest(user, requestId, statusValue) {
  const role = String(user.role || "").toUpperCase();
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    throw httpError("Você não tem permissão para analisar solicitações", 403);
  }

  const status = String(statusValue || "").toUpperCase();
  if (!STATUSES.includes(status)) throw httpError("Status de análise inválido", 400);

  const request = await requestRepository.findById(requestId);
  if (!request) throw httpError("Solicitação não encontrada", 404);

  if (
    role === "COORDINATOR"
    && String(request.userGroup || "").toUpperCase() !== String(user.grupo || "").toUpperCase()
  ) {
    throw httpError("Esta solicitação pertence a outro grupo", 403);
  }

  return requestRepository.updateStatus({ id: requestId, status, reviewerId: user.id });
}

module.exports = { createRequest, listRequests, reviewRequest };
