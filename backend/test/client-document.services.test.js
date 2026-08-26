const test = require("node:test");
const assert = require("node:assert/strict");
const clientDocumentRepository = require("../src/repositories/client-document.repository");
const clientRepository = require("../src/repositories/client.repository");
const privateFileService = require("../src/services/private-file.services");
const securityRepository = require("../src/repositories/security.repository");
const clientDocumentService = require("../src/services/client-document.services");

test("cliente lista somente os próprios documentos publicados", async (t) => {
  const original = clientDocumentRepository.list;
  t.after(() => { clientDocumentRepository.list = original; });
  let scope;
  clientDocumentRepository.list = async (value) => { scope = value; return []; };

  await clientDocumentService.listOwnDocuments({ id: 17, role: "USER" });
  assert.deepEqual(scope, { userId: 17, status: "PUBLISHED" });
});

test("normaliza IRPF e exige vencimento no boleto Itaú", () => {
  assert.deepEqual(
    clientDocumentService.normalizeMetadata({ type: "irpf", userId: "4", taxYear: "2026" }),
    {
      userId: 4,
      type: "IRPF",
      title: "IRPF 2026",
      taxYear: 2026,
      referenceMonth: null,
      dueDate: null,
      amount: null,
      digitableLine: null,
    },
  );
  assert.throws(
    () => clientDocumentService.normalizeMetadata({ type: "ITAU_BANK_SLIP", userId: 4 }),
    (error) => error.statusCode === 400,
  );
});

test("outro cliente não pode baixar documento por ID", async (t) => {
  const originalFind = clientDocumentRepository.findForDownload;
  const originalRead = privateFileService.readPdf;
  t.after(() => {
    clientDocumentRepository.findForDownload = originalFind;
    privateFileService.readPdf = originalRead;
  });
  clientDocumentRepository.findForDownload = async () => ({
    id: 8,
    userId: 9,
    status: "PUBLISHED",
    file: { storageKey: "nao-deve-ser-lido.pdf" },
  });
  privateFileService.readPdf = async () => assert.fail("arquivo não deve ser lido");

  await assert.rejects(
    () => clientDocumentService.downloadDocument({ id: 3, role: "USER" }, 8),
    (error) => error.statusCode === 404,
  );
});

test("upload de IRPF persiste PDF privado e não audita a chave de armazenamento", async (t) => {
  const originals = {
    findClient: clientRepository.findActiveByUserId,
    storePdf: privateFileService.storePdf,
    removePdf: privateFileService.removePdf,
    save: clientDocumentRepository.save,
    audit: securityRepository.audit,
  };
  t.after(() => {
    clientRepository.findActiveByUserId = originals.findClient;
    privateFileService.storePdf = originals.storePdf;
    privateFileService.removePdf = originals.removePdf;
    clientDocumentRepository.save = originals.save;
    securityRepository.audit = originals.audit;
  });
  clientRepository.findActiveByUserId = async () => ({ id: 2, userId: 4 });
  privateFileService.storePdf = async () => ({
    storageKey: "private-key.pdf",
    originalName: "irpf.pdf",
    mimeType: "application/pdf",
    sizeBytes: 100n,
    checksum: "abc",
  });
  privateFileService.removePdf = async () => undefined;
  clientDocumentRepository.save = async ({ document }) => ({
    document: { id: 11, ...document },
    replacedStorageKey: null,
  });
  let audited;
  securityRepository.audit = async (value) => { audited = value; };

  const result = await clientDocumentService.uploadDocument(
    { id: 1, role: "USER", isDocumentPublisher: true, isHrMember: true, isAccounting: false },
    { type: "IRPF", userId: 4, taxYear: 2026 },
    Buffer.from("%PDF-test"),
    "irpf.pdf",
  );
  assert.equal(result.id, 11);
  assert.equal(audited.action, "IRPF_PUBLISHED");
  assert.equal(audited.changes.storageKey, undefined);
});

test("RH publica IRPF, mas boleto Itaú é exclusivo da Contabilidade", async () => {
  await assert.rejects(
    () => clientDocumentService.uploadDocument(
      { id: 1, role: "USER", isDocumentPublisher: true, isHrMember: true, isAccounting: false },
      {
        type: "ITAU_BANK_SLIP",
        userId: 4,
        dueDate: "2026-09-10",
      },
      Buffer.from("%PDF-test"),
      "boleto.pdf",
    ),
    (error) => error.statusCode === 403,
  );
});

test("validação de PDF rejeita extensão disfarçada", () => {
  assert.throws(
    () => privateFileService.validatePdf(Buffer.from("arquivo executável")),
    (error) => error.statusCode === 415,
  );
  assert.equal(privateFileService.normalizeOriginalName("../IRPF 2026.PDF"), "IRPF 2026.pdf");
});
