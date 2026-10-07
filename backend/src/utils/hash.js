const argon2 = require("argon2");
const bcrypt = require("bcrypt");

const parameters = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 };

async function hashPassword(password) { return argon2.hash(password, parameters); }

async function comparePassword(password, hash) {
  if (typeof password !== "string" || typeof hash !== "string") return false;
  if (hash.startsWith("$argon2id$")) return argon2.verify(hash, password);
  // Compatibilidade com contas existentes. Novas senhas sempre usam Argon2id.
  if (/^\$2[aby]\$/.test(hash)) return bcrypt.compare(password, hash);
  return false;
}

function needsUpgrade(hash) { return !hash.startsWith("$argon2id$"); }
module.exports = { hashPassword, comparePassword, needsUpgrade };
