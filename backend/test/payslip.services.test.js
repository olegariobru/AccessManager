const test = require("node:test");
const assert = require("node:assert/strict");
const payslipRepository = require("../src/repositories/payslip.repository");
const securityRepository = require("../src/repositories/security.repository");
const payslipService = require("../src/services/payslip.services");

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

test("competência inválida é rejeitada antes de gravar", async () => {
  await assert.rejects(
    () => payslipService.upsertPayslip(
      { id: 1, role: "ADMIN" },
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
    { id: 1, role: "ADMIN" },
    { userId: 7, year: 2026, month: 7, publish: true },
  );
  assert.equal(result.status, "PUBLISHED");
  assert.equal(audited.action, "PAYSLIP_PUBLISHED");
  assert.equal(audited.changes.storageKey, undefined);
});
