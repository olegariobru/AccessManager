const test = require("node:test");
const assert = require("node:assert/strict");
const requestRepository = require("../src/repositories/request.repository");
const requestService = require("../src/services/request.services");

test("funcionário cria solicitação de férias válida", async (t) => {
  const originalCreate = requestRepository.create;
  t.after(() => { requestRepository.create = originalCreate; });
  requestRepository.create = async (request) => ({ id: 1, status: "PENDING", ...request });

  const result = await requestService.createRequest(
    { id: 7, role: "USER" },
    { type: "VACATION", startDate: "2026-08-10", endDate: "2026-08-20" },
  );

  assert.equal(result.userId, 7);
  assert.equal(result.type, "VACATION");
  assert.equal(result.status, "PENDING");
});

test("férias com período invertido são rejeitadas", async () => {
  await assert.rejects(
    () => requestService.createRequest(
      { id: 7, role: "USER" },
      { type: "VACATION", startDate: "2026-08-20", endDate: "2026-08-10" },
    ),
    (error) => error.statusCode === 400 && /inválido/.test(error.message),
  );
});

test("coordenador recebe apenas solicitações do próprio grupo", async (t) => {
  const originalFindByGroup = requestRepository.findByGroup;
  let queriedGroup;
  t.after(() => { requestRepository.findByGroup = originalFindByGroup; });
  requestRepository.findByGroup = async (group) => {
    queriedGroup = group;
    return [];
  };

  await requestService.listRequests({ id: 2, role: "COORDINATOR", grupo: "FINANCEIRO" });
  assert.equal(queriedGroup, "FINANCEIRO");
});

test("coordenador não analisa solicitação de outro grupo", async (t) => {
  const originalFindById = requestRepository.findById;
  t.after(() => { requestRepository.findById = originalFindById; });
  requestRepository.findById = async () => ({ id: 9, userGroup: "RH" });

  await assert.rejects(
    () => requestService.reviewRequest(
      { id: 2, role: "COORDINATOR", grupo: "FINANCEIRO" },
      9,
      "APPROVED",
    ),
    (error) => error.statusCode === 403 && /outro grupo/.test(error.message),
  );
});

test("administrador pode analisar qualquer solicitação", async (t) => {
  const originalFindById = requestRepository.findById;
  const originalUpdateStatus = requestRepository.updateStatus;
  t.after(() => {
    requestRepository.findById = originalFindById;
    requestRepository.updateStatus = originalUpdateStatus;
  });
  requestRepository.findById = async () => ({ id: 9, userGroup: "RH" });
  requestRepository.updateStatus = async (payload) => payload;

  const result = await requestService.reviewRequest(
    { id: 1, role: "ADMIN", grupo: "ADMIN" },
    9,
    "APPROVED",
  );
  assert.deepEqual(result, { id: 9, status: "APPROVED", reviewerId: 1 });
});
