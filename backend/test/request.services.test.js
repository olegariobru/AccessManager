const test = require("node:test");
const assert = require("node:assert/strict");
const requestRepository = require("../src/repositories/request.repository");
const securityRepository = require("../src/repositories/security.repository");
const requestService = require("../src/services/request.services");

function stubAudit(t) {
  const original = securityRepository.audit;
  securityRepository.audit = async () => {};
  t.after(() => { securityRepository.audit = original; });
}

test("funcionário cria férias válidas com quantidade inclusiva de dias", async (t) => {
  stubAudit(t);
  const original = requestRepository.createVacation;
  t.after(() => { requestRepository.createVacation = original; });
  requestRepository.createVacation = async (request) => ({
    id: 1,
    status: "PENDING",
    ...request,
  });
  const result = await requestService.createRequest(
    { id: 7, role: "USER" },
    { startDate: "2026-08-10", endDate: "2026-08-20", notes: null },
    "request-1",
  );
  assert.equal(result.userId, 7);
  assert.equal(result.days, 11);
});

test("férias com período invertido são rejeitadas", async () => {
  await assert.rejects(
    () => requestService.createRequest(
      { id: 7, role: "USER" },
      { startDate: "2026-08-20", endDate: "2026-08-10" },
    ),
    (error) => error.statusCode === 400 && /inválido/.test(error.message),
  );
});

test("coordenador pode solicitar as próprias férias", async (t) => {
  stubAudit(t);
  const original = requestRepository.createVacation;
  t.after(() => { requestRepository.createVacation = original; });
  requestRepository.createVacation = async (payload) => payload;
  const result = await requestService.createRequest(
    { id: 8, role: "COORDINATOR" },
    { startDate: "2026-09-01", endDate: "2026-09-10" },
  );
  assert.equal(result.userId, 8);
  assert.equal(result.days, 10);
  assert.equal(result.initialStatus, "PENDING_HR");
});

test("coordenador lista e analisa somente grupos atribuídos", async (t) => {
  stubAudit(t);
  const originalList = requestRepository.list;
  const originalFind = requestRepository.findById;
  const originalUpdate = requestRepository.updateStatus;
  t.after(() => {
    requestRepository.list = originalList;
    requestRepository.findById = originalFind;
    requestRepository.updateStatus = originalUpdate;
  });
  let scope;
  requestRepository.list = async (params) => {
    scope = params.groupIds;
    return [];
  };
  await requestService.listRequests(
    { id: 2, role: "COORDINATOR", groupIds: [3, 4] },
    {},
  );
  assert.deepEqual(scope, [3, 4]);

  requestRepository.findById = async () => ({ id: 9, groupId: 5, status: "PENDING" });
  await assert.rejects(
    () => requestService.reviewRequest(
      { id: 2, role: "COORDINATOR", groupIds: [3, 4] },
      9,
      { status: "APPROVED" },
    ),
    (error) => error.statusCode === 403,
  );

  requestRepository.findById = async () => ({ id: 10, groupId: 3, status: "PENDING" });
  requestRepository.updateStatus = async (payload) => payload;
  const updated = await requestService.reviewRequest(
    { id: 2, role: "COORDINATOR", groupIds: [3, 4] },
    10,
    { status: "APPROVED", reason: "Período aprovado" },
  );
  assert.equal(updated.status, "PENDING_HR");
  assert.equal(updated.reviewerId, 2);
});

test("administrador pode analisar qualquer grupo", async (t) => {
  stubAudit(t);
  const originalFind = requestRepository.findById;
  const originalUpdate = requestRepository.updateStatus;
  t.after(() => {
    requestRepository.findById = originalFind;
    requestRepository.updateStatus = originalUpdate;
  });
  requestRepository.findById = async () => ({ id: 9, groupId: 99, status: "PENDING" });
  requestRepository.updateStatus = async (payload) => payload;
  const result = await requestService.reviewRequest(
    { id: 1, role: "ADMIN", groupIds: [] },
    9,
    { status: "REJECTED" },
  );
  assert.equal(result.status, "REJECTED");
});

test("RH lista somente pedidos liberados e marca as férias", async (t) => {
  stubAudit(t);
  const originalList = requestRepository.list;
  const originalFind = requestRepository.findById;
  const originalMark = requestRepository.markAsScheduled;
  t.after(() => {
    requestRepository.list = originalList;
    requestRepository.findById = originalFind;
    requestRepository.markAsScheduled = originalMark;
  });

  let scope;
  requestRepository.list = async (params) => {
    scope = params;
    return [];
  };
  await requestService.listHrRequests({ id: 8, role: "USER", isHr: true });
  assert.deepEqual(scope.statuses, ["PENDING_HR", "APPROVED", "REJECTED"]);

  requestRepository.findById = async () => ({ id: 10, status: "PENDING_HR" });
  requestRepository.markAsScheduled = async (payload) => ({ ...payload, status: "APPROVED" });
  const result = await requestService.markRequestByHr(
    { id: 8, role: "USER", isHr: true },
    10,
  );
  assert.equal(result.status, "APPROVED");
  assert.equal(result.schedulerId, 8);
});

test("coordenador não pode analisar as próprias férias", async (t) => {
  const originalFind = requestRepository.findById;
  t.after(() => { requestRepository.findById = originalFind; });
  requestRepository.findById = async () => ({ id: 20, userId: 8, groupId: 3, status: "PENDING" });
  await assert.rejects(
    () => requestService.reviewRequest(
      { id: 8, role: "COORDINATOR", groupIds: [3] },
      20,
      { status: "APPROVED" },
    ),
    (error) => error.statusCode === 403 && error.code === "SELF_REVIEW_DENIED",
  );
});

test("RH pode recusar férias com motivo e não pode recusar sem motivo", async (t) => {
  stubAudit(t);
  const originalFind = requestRepository.findById;
  const originalDecide = requestRepository.decideByHr;
  t.after(() => {
    requestRepository.findById = originalFind;
    requestRepository.decideByHr = originalDecide;
  });
  requestRepository.findById = async () => ({ id: 21, status: "PENDING_HR" });
  requestRepository.decideByHr = async (payload) => payload;

  await assert.rejects(
    () => requestService.decideRequestByHr(
      { id: 9, role: "USER", isHr: true }, 21, { status: "REJECTED" },
    ),
    (error) => error.statusCode === 400 && error.code === "REASON_REQUIRED",
  );
  const result = await requestService.decideRequestByHr(
    { id: 9, role: "USER", isHr: true },
    21,
    { status: "REJECTED", reason: "Período indisponível" },
  );
  assert.equal(result.status, "REJECTED");
  assert.equal(result.reason, "Período indisponível");
});

test("usuário fora do RH não acessa nem conclui a fila do RH", async () => {
  const tiUser = { id: 7, role: "USER", isHr: false };
  await assert.rejects(
    () => requestService.listHrRequests(tiUser),
    (error) => error.statusCode === 403 && error.code === "HR_ACCESS_DENIED",
  );
  await assert.rejects(
    () => requestService.markRequestByHr(tiUser, 10),
    (error) => error.statusCode === 403 && error.code === "HR_ACCESS_DENIED",
  );
});
