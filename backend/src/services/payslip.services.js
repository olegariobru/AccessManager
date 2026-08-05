const payslipRepository = require("../repositories/payslip.repository");
const securityRepository = require("../repositories/security.repository");

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listPayslips(user) {
  const scope = user.role === "ADMIN"
    ? {}
    : user.role === "COORDINATOR"
      ? { groupIds: user.groupIds }
      : { userId: user.id, status: "PUBLISHED" };
  return payslipRepository.list(scope);
}

async function listOwnPayslips(user) {
  return payslipRepository.list({ userId: user.id, status: "PUBLISHED" });
}

async function upsertPayslip(actor, payload = {}) {
  const userId = Number(payload.userId);
  const year = Number(payload.year);
  const month = Number(payload.month);
  if (!Number.isInteger(userId) || !Number.isInteger(year) || !Number.isInteger(month)
    || month < 1 || month > 12 || year < 2000 || year > 2200) {
    throw httpError("Usuário ou competência inválida", 400);
  }
  if (payload.file && (!payload.file.storageKey || !payload.file.originalName || !payload.file.mimeType)) {
    throw httpError("Metadados do arquivo são inválidos", 400);
  }
  if (payload.file && (!Number.isSafeInteger(Number(payload.file.sizeBytes)) || Number(payload.file.sizeBytes) < 0)) {
    throw httpError("Tamanho do arquivo é inválido", 400);
  }

  const payslip = await payslipRepository.upsert({
    userId,
    year,
    month,
    grossAmount: payload.grossAmount,
    netAmount: payload.netAmount,
    file: payload.file ? {
      storageKey: String(payload.file.storageKey),
      originalName: String(payload.file.originalName),
      mimeType: String(payload.file.mimeType),
      sizeBytes: BigInt(payload.file.sizeBytes || 0),
      checksum: payload.file.checksum ? String(payload.file.checksum) : null,
    } : null,
    publisherId: actor.id,
    publish: Boolean(payload.publish),
  });
  await securityRepository.audit({
    actorId: actor.id,
    action: payload.publish ? "PAYSLIP_PUBLISHED" : "PAYSLIP_SAVED",
    entityType: "Payslip",
    entityId: payslip.id,
    changes: { userId, year, month, status: payslip.status },
  });
  return payslip;
}

module.exports = { listPayslips, listOwnPayslips, upsertPayslip };
