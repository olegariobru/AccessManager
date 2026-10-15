const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePagination, pageInfo, MAX_PAGE_SIZE } = require("../src/security/pagination");

test("paginação aplica padrão e mantém cada consulta limitada", () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 100, skip: 0, take: 100 });
  assert.deepEqual(parsePagination({ page: "3", limit: "100" }), {
    page: 3, limit: 100, skip: 200, take: 100,
  });
  assert.equal(MAX_PAGE_SIZE, 100);
  assert.deepEqual(pageInfo(parsePagination({ page: "3", limit: "2" }), 2), {
    page: 3, limit: 2, nextPage: 4,
  });
  assert.equal(pageInfo(parsePagination({ page: "3", limit: "2" }), 1).nextPage, null);
});

test("paginação rejeita limites, páginas e formatos manipulados", () => {
  for (const query of [
    { page: "0" }, { page: "10001" }, { page: "1.5" },
    { limit: "101" }, { limit: "-1" }, { limit: "999999999999999999999" },
  ]) {
    assert.throws(
      () => parsePagination(query),
      (error) => error.statusCode === 400 && error.code === "INVALID_PAGINATION",
    );
  }
});
