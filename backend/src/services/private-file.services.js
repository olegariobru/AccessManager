const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const storageDirectory = path.resolve(
  process.env.PRIVATE_STORAGE_DIR || path.join(__dirname, "../../storage/private"),
);

function httpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeOriginalName(value) {
  const normalized = path.basename(String(value || "documento.pdf"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  const name = normalized || "documento.pdf";
  const stem = name.replace(/\.pdf$/i, "").slice(0, 251) || "documento";
  return `${stem}.pdf`;
}

function validatePdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw httpError("Selecione um arquivo PDF", 400, "PDF_REQUIRED");
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw httpError("O arquivo PDF deve ter no máximo 10 MB", 413, "PDF_TOO_LARGE");
  }
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw httpError("O conteúdo enviado não é um PDF válido", 415, "INVALID_PDF");
  }
}

function resolveStoragePath(storageKey) {
  const normalizedKey = String(storageKey || "");
  if (!/^[0-9a-f-]{36}\.pdf$/i.test(normalizedKey)) {
    throw httpError("Arquivo privado inválido", 404, "PRIVATE_FILE_NOT_FOUND");
  }
  const resolved = path.resolve(storageDirectory, normalizedKey);
  if (path.dirname(resolved) !== storageDirectory) {
    throw httpError("Arquivo privado inválido", 404, "PRIVATE_FILE_NOT_FOUND");
  }
  return resolved;
}

async function storePdf(buffer, originalName) {
  validatePdf(buffer);
  await fs.mkdir(storageDirectory, { recursive: true, mode: 0o700 });
  const storageKey = `${crypto.randomUUID()}.pdf`;
  const target = resolveStoragePath(storageKey);
  await fs.writeFile(target, buffer, { flag: "wx", mode: 0o600 });
  return {
    storageKey,
    originalName: normalizeOriginalName(originalName),
    mimeType: "application/pdf",
    sizeBytes: BigInt(buffer.length),
    checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

async function readPdf(storageKey) {
  try {
    const target = resolveStoragePath(storageKey);
    const stats = await fs.lstat(target);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw httpError("Arquivo privado não encontrado", 404, "PRIVATE_FILE_NOT_FOUND");
    }
    return await fs.readFile(target);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw httpError("Arquivo privado não encontrado", 404, "PRIVATE_FILE_NOT_FOUND");
    }
    throw error;
  }
}

async function removePdf(storageKey) {
  if (!storageKey) return;
  try {
    await fs.unlink(resolveStoragePath(storageKey));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = {
  MAX_PDF_BYTES,
  normalizeOriginalName,
  validatePdf,
  storePdf,
  readPdf,
  removePdf,
};
