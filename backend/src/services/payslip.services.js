const payslipRepository = require("../repositories/payslip.repository");
const securityRepository = require("../repositories/security.repository");
const clientRepository = require("../repositories/client.repository");
const privateFileService = require("./private-file.services");

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertDocumentPublisher(actor) {
  if (!actor?.isDocumentPublisher) {
    throw httpError("Publicação exclusiva para integrantes do RH ou da Contabilidade", 403);
  }
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

async function listAllPayslips(actor) {
  assertDocumentPublisher(actor);
  return payslipRepository.list();
}

async function upsertPayslip(actor, payload = {}) {
  assertDocumentPublisher(actor);
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

function normalizeAmount(value, label) {
  if (value == null || value === "") return undefined;
  const amount = Number(String(value).replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) {
    throw httpError(`${label} inválido`, 400);
  }
  return amount;
}

async function uploadPayslip(actor, payload = {}, buffer, originalName) {
  assertDocumentPublisher(actor);
  const userId = Number(payload.userId);
  const year = Number(payload.year);
  const month = Number(payload.month);
  if (!Number.isInteger(userId) || !Number.isInteger(year) || !Number.isInteger(month)
    || month < 1 || month > 12 || year < 2000 || year > 2200) {
    throw httpError("Cliente ou competência inválida", 400);
  }
  const targetClient = await clientRepository.findActiveByUserId(userId);
  if (!targetClient) throw httpError("Cliente ativo não encontrado", 404);

  const file = await privateFileService.storePdf(buffer, originalName);
  let result;
  try {
    result = await payslipRepository.upsertWithFile({
      userId,
      year,
      month,
      grossAmount: normalizeAmount(payload.grossAmount, "Salário bruto"),
      netAmount: normalizeAmount(payload.netAmount, "Salário líquido"),
      file,
      publisherId: actor.id,
    });
  } catch (error) {
    await privateFileService.removePdf(file.storageKey);
    throw error;
  }
  await privateFileService.removePdf(result.replacedStorageKey).catch(() => undefined);
  await securityRepository.audit({
    actorId: actor.id,
    action: "PAYSLIP_PUBLISHED",
    entityType: "Payslip",
    entityId: result.payslip.id,
    changes: { userId, year, month, status: "PUBLISHED" },
  });
  return result.payslip;
}

async function downloadPayslip(actor, id) {
  const payslip = await payslipRepository.findForDownload(id);
  const allowed = payslip?.file && (
    actor.role === "ADMIN"
    || (payslip.userId === actor.id && payslip.status === "PUBLISHED")
  );
  if (!allowed) throw httpError("Holerite não encontrado", 404);
  const buffer = await privateFileService.readPdf(payslip.file.storageKey);
  await securityRepository.audit({
    actorId: actor.id,
    action: "PAYSLIP_DOWNLOADED",
    entityType: "Payslip",
    entityId: payslip.id,
    changes: { year: payslip.year, month: payslip.month },
  });
  return { buffer, file: payslip.file };
}

module.exports = {
  listPayslips,
  listOwnPayslips,
  listAllPayslips,
  upsertPayslip,
  uploadPayslip,
  downloadPayslip,
};
