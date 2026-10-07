const {
  hashPassword,
  comparePassword,
  needsUpgrade,
} = require("../utils/hash");
const userRepository = require("../repositories/user.repository");

const dummyHash = hashPassword(
  "senha-aleatoria-de-comparacao-" +
    require("node:crypto").randomBytes(16).toString("hex"),
);

const ALLOWED_ROLES = ["USER", "COORDINATOR", "ADMIN"];

function httpError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeCreatePayload(payload = {}, roleCode = "USER") {
  const normalized = {
    name: String(payload.name || "").trim(),
    email: String(payload.email || "")
      .trim()
      .toLowerCase(),
    password: String(payload.password || ""),
    roleCode: String(roleCode || payload.roleCode || payload.role || "USER")
      .trim()
      .toUpperCase(),
    groupId: Number(payload.groupId),
    positionId: Number(payload.positionId),
  };

  if (
    normalized.name.length > 150 ||
    normalized.email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
  ) {
    throw httpError("Nome ou e-mail inválido", 400, "INVALID_IDENTITY");
  }
  if (!normalized.name || !normalized.email || !normalized.password) {
    throw httpError(
      "Nome, e-mail e senha são obrigatórios",
      400,
      "REQUIRED_FIELDS",
    );
  }
  if (normalized.password.length < 12 || normalized.password.length > 128) {
    throw httpError(
      "A senha deve ter entre 12 e 128 caracteres",
      400,
      "INVALID_PASSWORD",
    );
  }
  if (!ALLOWED_ROLES.includes(normalized.roleCode)) {
    throw httpError("Perfil inválido", 400, "INVALID_ROLE");
  }
  if (
    !Number.isInteger(normalized.groupId) ||
    !Number.isInteger(normalized.positionId)
  ) {
    throw httpError(
      "Grupo e cargo válidos são obrigatórios",
      400,
      "INVALID_ORGANIZATION",
    );
  }
  return normalized;
}

async function createUserByAdmin(payload = {}, actor) {
  const data = normalizeCreatePayload(
    payload,
    payload.roleCode || payload.role,
  );
  return createNormalizedUser(data, {
    actorId: actor.id,
    action: "USER_CREATED",
    entityType: "User",
    changes: {
      roleCode: data.roleCode,
      groupId: data.groupId,
      positionId: data.positionId,
    },
  });
}

async function createNormalizedUser(data, auditEvent) {
  const existing = await userRepository.findByEmail(data.email);
  if (existing)
    throw httpError("E-mail já cadastrado", 409, "EMAIL_ALREADY_EXISTS");
  return userRepository.createWithAccess({
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    roleCodes: [data.roleCode],
    groupId: data.groupId,
    positionId: data.positionId,
    mustChangePassword: true,
    auditEvent,
  });
}

async function login({ email, password }) {
  const storedUser = await userRepository.findByEmail(
    String(email || "")
      .trim()
      .toLowerCase(),
  );
  const candidateHash = storedUser?.passwordHash || (await dummyHash);
  const valid = await comparePassword(password, candidateHash);
  if (
    !storedUser ||
    !valid ||
    !storedUser.roles?.length ||
    storedUser.status !== "ACTIVE" ||
    storedUser.deletedAt
  ) {
    throw httpError("E-mail ou senha inválidos", 401, "INVALID_CREDENTIALS");
  }

  const user = await userRepository.withMasterGroupScope(
    userRepository.toPublicUser(storedUser),
  );
  if (needsUpgrade(storedUser.passwordHash)) {
    await userRepository.upgradePasswordHash(
      storedUser.id,
      storedUser.passwordHash,
      await hashPassword(password),
    );
  }
  return { user };
}

async function getUserById(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw httpError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  return user;
}

async function listUsers(search) {
  const normalizedSearch = String(search || "").trim();
  if (normalizedSearch.length > 100) {
    throw httpError(
      "A pesquisa deve ter no máximo 100 caracteres",
      400,
      "INVALID_SEARCH",
    );
  }
  return userRepository.findAll(normalizedSearch);
}

async function updateUser(userId, payload, actor) {
  const roleCode = String(payload.roleCode || payload.role || "")
    .trim()
    .toUpperCase();
  const groupId = Number(payload.groupId);
  const positionId = Number(payload.positionId);
  if (
    !ALLOWED_ROLES.includes(roleCode) ||
    !Number.isInteger(groupId) ||
    !Number.isInteger(positionId)
  ) {
    throw httpError(
      "Perfil, grupo ou cargo inválido",
      400,
      "INVALID_ORGANIZATION",
    );
  }

  const current = await userRepository.findById(userId);
  if (!current)
    throw httpError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  const user = await userRepository.updateAccess(
    userId,
    { roleCode, groupId, positionId },
    {
      actorId: actor.id,
      action: "USER_ACCESS_UPDATED",
      entityType: "User",
      entityId: userId,
      changes: {
        before: {
          role: current.role,
          groupId: current.group?.id,
          positionId: current.position?.id,
        },
        after: { roleCode, groupId, positionId },
      },
    },
  );
  return user;
}

async function deleteUser(userId, authenticatedUser) {
  if (String(userId) === String(authenticatedUser.id)) {
    throw httpError(
      "Não é permitido inativar o próprio usuário",
      403,
      "SELF_DEACTIVATION_DENIED",
    );
  }
  const current = await userRepository.findById(userId);
  if (!current)
    throw httpError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  const user = await userRepository.deactivate(userId, {
    actorId: authenticatedUser.id,
    action: "USER_DEACTIVATED",
    entityType: "User",
    entityId: userId,
  });
  return user;
}

async function changeOwnPassword(user, payload = {}) {
  const password = String(payload.password || "");
  if (password.length < 12 || password.length > 128) {
    throw httpError(
      "A nova senha deve ter entre 12 e 128 caracteres",
      400,
      "INVALID_PASSWORD",
    );
  }
  if (!user.mustChangePassword) {
    const stored = await userRepository.findByEmail(user.email);
    if (
      !stored ||
      !(await comparePassword(payload.currentPassword, stored.passwordHash))
    ) {
      throw httpError(
        "Senha atual incorreta",
        403,
        "CURRENT_PASSWORD_REQUIRED",
      );
    }
  }
  await userRepository.changePassword(
    user.id,
    await hashPassword(password),
    {
      actorId: user.id,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
    },
    user.tokenVersion,
  );
}

module.exports = {
  createUserByAdmin,
  login,
  getUserById,
  listUsers,
  updateUser,
  deleteUser,
  changeOwnPassword,
};
