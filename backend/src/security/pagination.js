const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10_000;

function httpError(message, code) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function parsePagination(query = {}) {
  const pageText = query.page == null ? "1" : String(query.page);
  const limitText = query.limit == null ? String(DEFAULT_PAGE_SIZE) : String(query.limit);
  if (!/^\d+$/.test(pageText) || !/^\d+$/.test(limitText)) {
    throw httpError("Paginação inválida", "INVALID_PAGINATION");
  }
  const page = Number(pageText);
  const limit = Number(limitText);
  if (!Number.isSafeInteger(page) || page < 1 || page > MAX_PAGE
    || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw httpError("Paginação fora dos limites permitidos", "INVALID_PAGINATION");
  }
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function pageInfo(pagination, itemCount) {
  return {
    page: pagination.page,
    limit: pagination.limit,
    nextPage: itemCount === pagination.limit && pagination.page < MAX_PAGE
      ? pagination.page + 1
      : null,
  };
}

module.exports = { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_PAGE, parsePagination, pageInfo };
