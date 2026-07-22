const pool = require("../config/db");

// CREATE
async function create({ name, email, password }) {
  const result = await pool.query(
    `INSERT INTO "User" (name, email, password, role, "createdAt")
     VALUES ($1, $2, $3, 'USER', NOW())
     RETURNING id, name, email`,
    [name, email, password]
  );

  return result.rows[0];
}

// FIND BY EMAIL
async function findByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM "User" WHERE email = $1`,
    [email]
  );

  return result.rows[0];
}

module.exports = {
  create,
  findByEmail
};