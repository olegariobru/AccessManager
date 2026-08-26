const clientDocumentRepository = require("../repositories/client-document.repository");
const clientRepository = require("../repositories/client.repository");
const securityRepository = require("../repositories/security.repository");
const privateFileService = require("./private-file.services");

const ALLOWED_TYPES = ["IRPF", "ITAU_BANK_SLIP"];

function httpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function parseOptionalMonth(value) {
  if (value == null || value === "") return null;
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw httpError("Mês de referência inválido", 400, "INVALID_REFERENCE_MONTH");
  }
  return month;
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw httpError("Data de vencimento inválida", 400, "INVALID_DUE_DATE");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw httpError("Data de vencimento inválida", 400, "INVALID_DUE_DATE");
  }
  return date;
}

function normalizeTitle(value, fallback) {
  return String(value || "").trim().slice(0, 160) || fallback;
}

function normalizeMetadata(payload = {}) {
  const type = String(payload.type || "").trim().toUpperCase();
  const userId = Number(payload.userId);
  if (!ALLOWED_TYPES.includes(type)) {
    throw httpError("Tipo de documento inválido", 400, "INVALID_DOCUMENT_TYPE");
  }
  if (!Number.isInteger(userId) || userId < 1) {
    throw httpError("Cliente inválido", 400, "INVALID_CLIENT");
  }

  if (type === "IRPF") {
    const taxYear = Number(payload.taxYear);
    if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2200) {
      throw httpError("Ano do IRPF inválido", 400, "INVALID_TAX_YEAR");
    }
    return {
      userId,
      type,
      title: normalizeTitle(payload.title, `IRPF ${taxYear}`),
      taxYear,
      referenceMonth: null,
      dueDate: null,
      amount: null,
      digitableLine: null,
    };
  }

  const amountText = String(payload.amount ?? "").trim().replace(",", ".");
  const amount = amountText === "" ? null : Number(amountText);
  if (amount != null && (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99)) {
    throw httpError("Valor do boleto inválido", 400, "INVALID_BANK_SLIP_AMOUNT");
  }
  const digitableLine = String(payload.digitableLine || "").replace(/\D/g, "");
  if (digitableLine && ![44, 47, 48].includes(digitableLine.length)) {
    throw httpError("A linha digitável deve ter 44, 47 ou 48 números", 400, "INVALID_DIGITABLE_LINE");
  }
  return {
    userId,
    type,
    title: normalizeTitle(payload.title, "Boleto Itaú"),
    taxYear: null,
    referenceMonth: parseOptionalMonth(payload.referenceMonth),
    dueDate: parseDate(payload.dueDate),
    amount,
    digitableLine: digitableLine || null,
  };
}

async function listOwnDocuments(actor) {
  return clientDocumentRepository.list({
    userId: actor.id,
    status: "PUBLISHED",
  });
}

async function listAllDocuments(actor) {
  if (!actor?.isDocumentPublisher) {
    throw httpError("Acesso exclusivo para integrantes do RH ou da Contabilidade", 403, "FORBIDDEN");
  }
  return clientDocumentRepository.list(actor.isAccounting ? {} : { type: "IRPF" });
}

async function uploadDocument(actor, payload, buffer, originalName) {
  if (!actor?.isDocumentPublisher) {
    throw httpError("Publicação exclusiva para integrantes do RH ou da Contabilidade", 403, "FORBIDDEN");
  }
  const document = normalizeMetadata(payload);
  if (document.type === "ITAU_BANK_SLIP" && !actor.isAccounting) {
    throw httpError("Publicação de boletos exclusiva para a Contabilidade", 403, "FORBIDDEN");
  }
  const targetClient = await clientRepository.findActiveByUserId(document.userId);
  if (!targetClient) throw httpError("Cliente ativo não encontrado", 404, "CLIENT_NOT_FOUND");

  const file = await privateFileService.storePdf(buffer, originalName);
  let result;
  try {
    result = await clientDocumentRepository.save({
      document: {
        ...document,
        status: "PUBLISHED",
        publishedById: actor.id,
        publishedAt: new Date(),
      },
      file,
    });
  } catch (error) {
    await privateFileService.removePdf(file.storageKey);
    throw error;
  }
  await privateFileService.removePdf(result.replacedStorageKey).catch(() => undefined);
  await securityRepository.audit({
    actorId: actor.id,
    action: document.type === "IRPF" ? "IRPF_PUBLISHED" : "ITAU_BANK_SLIP_PUBLISHED",
    entityType: "ClientDocument",
    entityId: result.document.id,
    changes: {
      userId: document.userId,
      type: document.type,
      taxYear: document.taxYear,
      referenceMonth: document.referenceMonth,
      dueDate: document.dueDate,
    },
  });
  return result.document;
}

async function downloadDocument(actor, id) {
  const document = await clientDocumentRepository.findForDownload(id);
  const allowed = document && (
    actor.role === "ADMIN"
    || (document.userId === actor.id && document.status === "PUBLISHED")
  );
  if (!allowed) throw httpError("Documento não encontrado", 404, "DOCUMENT_NOT_FOUND");
  const buffer = await privateFileService.readPdf(document.file.storageKey);
  await securityRepository.audit({
    actorId: actor.id,
    action: "CLIENT_DOCUMENT_DOWNLOADED",
    entityType: "ClientDocument",
    entityId: document.id,
    changes: { type: document.type },
  });
  return { buffer, file: document.file };
}

module.exports = {
  ALLOWED_TYPES,
  normalizeMetadata,
  listOwnDocuments,
  listAllDocuments,
  uploadDocument,
  downloadDocument,
};
