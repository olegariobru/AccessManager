const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { constants } = require("node:fs");
const { Worker } = require("node:worker_threads");
let validating = 0;

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
    // Remove control characters from filenames before Content-Disposition.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  const name = normalized || "documento.pdf";
  const stem = name.replace(/\.pdf$/i, "").slice(0, 251) || "documento";
  return `${stem}.pdf`;
}

async function validatePdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw httpError("Selecione um arquivo PDF", 400, "PDF_REQUIRED");
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw httpError("O arquivo PDF deve ter no máximo 10 MB", 413, "PDF_TOO_LARGE");
  }
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw httpError("O conteúdo enviado não é um PDF válido", 415, "INVALID_PDF");
  }
  if (!buffer.subarray(-2048).includes(Buffer.from("%%EOF"))) {
    throw httpError("O conteúdo enviado não é um PDF válido", 415, "INVALID_PDF");
  }
  if (validating >= 2) throw httpError("Validação ocupada. Tente novamente.", 503, "PDF_VALIDATION_BUSY");
  validating += 1;
  try {
    const valid = await new Promise((resolve) => {
      const worker = new Worker(path.join(__dirname, "../security/pdf-worker.js"), {
        workerData: buffer, resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 },
      });
      const timer = setTimeout(() => { void worker.terminate(); resolve(false); }, 3000);
      const finish = (result) => { clearTimeout(timer); void worker.terminate(); resolve(result); };
      worker.once("message", finish);
      worker.once("error", () => finish(false));
      worker.once("exit", () => finish(false));
    });
    if (!valid) throw httpError("PDF inválido, protegido ou com conteúdo ativo não permitido", 415, "INVALID_PDF");
  } finally { validating -= 1; }

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
  await validatePdf(buffer);
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

async function readPdf(storageKey, checksum) {
  let handle;
  try {
    handle = await fs.open(resolveStoragePath(storageKey), constants.O_RDONLY | constants.O_NOFOLLOW);
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAX_PDF_BYTES) throw httpError("Arquivo privado não encontrado", 404, "PRIVATE_FILE_NOT_FOUND");
    const buffer = await handle.readFile();
    if (checksum && crypto.createHash("sha256").update(buffer).digest("hex") !== checksum) {
      throw httpError("Arquivo indisponível: verificação de integridade falhou", 409, "FILE_INTEGRITY_FAILED");
    }
    return buffer;
  } catch (error) {
    if (["ENOENT", "ELOOP"].includes(error.code)) throw httpError("Arquivo privado não encontrado", 404, "PRIVATE_FILE_NOT_FOUND");
    throw error;
  } finally { await handle?.close(); }
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
