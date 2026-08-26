const test = require("node:test");
const assert = require("node:assert/strict");
const payslipRepository = require("../src/repositories/payslip.repository");
const securityRepository = require("../src/repositories/security.repository");
const payslipService = require("../src/services/payslip.services");
const prisma = require("../src/config/prisma");

test("usuário lista somente holerites publicados da própria conta", async (t) => {
  const original = payslipRepository.list;
  t.after(() => { payslipRepository.list = original; });
  let scope;
  payslipRepository.list = async (value) => {
    scope = value;
    return [];
  };
  await payslipService.listPayslips({ id: 7, role: "USER" });
  assert.deepEqual(scope, { userId: 7, status: "PUBLISHED" });
});

test("RH e Contabilidade listam todos os holerites sem filtro obrigatório", async (t) => {
  const original = payslipRepository.list;
  t.after(() => { payslipRepository.list = original; });
  let receivedArguments = "not-called";
  payslipRepository.list = async (...args) => {
    receivedArguments = args;
    return [];
  };

  await payslipService.listAllPayslips({ id: 3, isDocumentPublisher: true });
  assert.deepEqual(receivedArguments, []);
});

test("repositório aceita listagem sem objeto de filtros", async (t) => {
  const original = prisma.payslip.findMany;
  t.after(() => { prisma.payslip.findMany = original; });
  let query;
  prisma.payslip.findMany = async (value) => { query = value; return []; };

  const payslips = await payslipRepository.list();
  assert.deepEqual(payslips, []);
  assert.deepEqual(query.where, {});
});

test("competência inválida é rejeitada antes de gravar", async () => {
  await assert.rejects(
    () => payslipService.upsertPayslip(
      { id: 1, role: "USER", isDocumentPublisher: true, isAccounting: true },
      { userId: 7, year: 2026, month: 13 },
    ),
    (error) => error.statusCode === 400,
  );
});

test("publicação registra auditoria sem expor chave do arquivo", async (t) => {
  const originalUpsert = payslipRepository.upsert;
  const originalAudit = securityRepository.audit;
  let audited;
  t.after(() => {
    payslipRepository.upsert = originalUpsert;
    securityRepository.audit = originalAudit;
  });
  payslipRepository.upsert = async (payload) => ({ id: 10, status: "PUBLISHED", ...payload });
  securityRepository.audit = async (payload) => { audited = payload; };
  const result = await payslipService.upsertPayslip(
    { id: 1, role: "USER", isDocumentPublisher: true, isHrMember: true },
    { userId: 7, year: 2026, month: 7, publish: true },
  );
  assert.equal(result.status, "PUBLISHED");
  assert.equal(audited.action, "PAYSLIP_PUBLISHED");
  assert.equal(audited.changes.storageKey, undefined);
});

test("administrador fora de RH ou Contabilidade não publica holerite", async () => {
  await assert.rejects(
    () => payslipService.upsertPayslip(
      { id: 1, role: "ADMIN", isDocumentPublisher: false, isAccounting: false },
      { userId: 7, year: 2026, month: 7, publish: true },
    ),
    (error) => error.statusCode === 403,
  );
});
