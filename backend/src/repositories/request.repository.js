const pool = require("../config/db");

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "EmployeeRequest" (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('VACATION', 'PAYSLIP')),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      "startDate" DATE,
      "endDate" DATE,
      notes VARCHAR(500),
      "reviewedBy" INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
      "reviewedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function selectFields() {
  return `
    SELECT
      request.id,
      request.type,
      request.status,
      request."startDate",
      request."endDate",
      request.notes,
      request."createdAt",
      request."updatedAt",
      request."reviewedAt",
      employee.id AS "userId",
      employee.name AS "userName",
      employee.email AS "userEmail",
      employee.grupo AS "userGroup",
      reviewer.name AS "reviewerName"
    FROM "EmployeeRequest" request
    JOIN "User" employee ON employee.id = request."userId"
    LEFT JOIN "User" reviewer ON reviewer.id = request."reviewedBy"
  `;
}

async function create({ userId, type, startDate, endDate, notes }) {
  await ensureTable();
  const result = await pool.query(
    `INSERT INTO "EmployeeRequest"
      ("userId", type, "startDate", "endDate", notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, type, startDate || null, endDate || null, notes || null],
  );
  return findById(result.rows[0].id);
}

async function findById(id) {
  await ensureTable();
  const result = await pool.query(`${selectFields()} WHERE request.id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
}

async function findByUser(userId) {
  await ensureTable();
  const result = await pool.query(
    `${selectFields()} WHERE request."userId" = $1 ORDER BY request."createdAt" DESC`,
    [userId],
  );
  return result.rows;
}

async function findByGroup(group) {
  await ensureTable();
  const result = await pool.query(
    `${selectFields()}
     WHERE UPPER(employee.grupo) = UPPER($1)
     ORDER BY CASE WHEN request.status = 'PENDING' THEN 0 ELSE 1 END,
              request."createdAt" DESC`,
    [group],
  );
  return result.rows;
}

async function findAll() {
  await ensureTable();
  const result = await pool.query(
    `${selectFields()}
     ORDER BY CASE WHEN request.status = 'PENDING' THEN 0 ELSE 1 END,
              request."createdAt" DESC`,
  );
  return result.rows;
}

async function updateStatus({ id, status, reviewerId }) {
  await ensureTable();
  await pool.query(
    `UPDATE "EmployeeRequest"
     SET status = $1, "reviewedBy" = $2, "reviewedAt" = NOW(), "updatedAt" = NOW()
     WHERE id = $3`,
    [status, reviewerId, id],
  );
  return findById(id);
}

module.exports = { create, findById, findByUser, findByGroup, findAll, updateStatus };
