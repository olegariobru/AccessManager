const pool = require("../config/db");

// CREATE
async function create({ name, email, password, role, cargo, grupo }) {
  const result = await pool.query(
    `INSERT INTO "User" (name, email, password, role, cargo, grupo, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, name, email, role, cargo, grupo`,
    [
      name,
      email,
      password, 
      String(role || "USER").toUpperCase(),
      cargo || "Colaborador",
      grupo || "USUARIOS"
    ]
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

async function findAll() {
  const result = await pool.query(
    `SELECT id, name, email, role, cargo, grupo, "createdAt"
     FROM "User"
     ORDER BY name ASC`
  );

  return result.rows;
}

module.exports = {
  create,
  findByEmail,
  findAll
};
